import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchCached } from './cache';

const DETAIL_URL = (id: string) => `https://www.americanwhitewater.org/content/River/view/river-detail/${id}/main`;
const COORDS_CACHE_FILE = join(process.cwd(), 'data', 'cache', 'aw-reach-coords.json');

export interface ReachCoords {
	put_in_lat: number | null;
	put_in_lon: number | null;
	take_out_lat: number | null;
	take_out_lon: number | null;
	center_lat: number | null;
	center_lon: number | null;
}

interface CoordsCacheFile {
	[reachId: string]: ReachCoords | 'miss';
}

let memCache: CoordsCacheFile | null = null;

function loadCoordsCache(): CoordsCacheFile {
	if (memCache) return memCache;
	if (existsSync(COORDS_CACHE_FILE)) {
		try {
			memCache = JSON.parse(readFileSync(COORDS_CACHE_FILE, 'utf-8'));
			return memCache!;
		} catch {}
	}
	memCache = {};
	return memCache;
}

function saveCoordsCache() {
	if (!memCache) return;
	writeFileSync(COORDS_CACHE_FILE, JSON.stringify(memCache, null, 0));
}

function decodeNextPushText(html: string): string {
	const matches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
	let combined = '';
	for (const m of matches) {
		try { combined += JSON.parse('"' + m[1] + '"'); } catch {}
	}
	return combined;
}

function extractCoords(html: string): ReachCoords {
	const decoded = decodeNextPushText(html);
	const poiKey = '"pointOfInterests":';
	const idx = decoded.indexOf(poiKey);
	const result: ReachCoords = {
		put_in_lat: null, put_in_lon: null,
		take_out_lat: null, take_out_lon: null,
		center_lat: null, center_lon: null,
	};
	if (idx < 0) return result;
	// Parse balanced array.
	const arrayStart = decoded.indexOf('[', idx);
	if (arrayStart < 0) return result;
	let depth = 0, end = -1;
	for (let i = arrayStart; i < decoded.length; i++) {
		const ch = decoded[i];
		if (ch === '[') depth++;
		else if (ch === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
	}
	if (end < 0) return result;
	try {
		const pois = JSON.parse(decoded.slice(arrayStart, end)) as Array<any>;
		for (const p of pois) {
			const lat = typeof p.lat === 'number' ? p.lat : (p.lat != null ? parseFloat(p.lat) : null);
			const lon = typeof p.lng === 'number' ? p.lng : (p.lng != null ? parseFloat(p.lng) : null);
			if (lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) continue;
			const types = Array.isArray(p.types) ? p.types : [];
			if (types.includes('put-in')) { result.put_in_lat = lat; result.put_in_lon = lon; }
			else if (types.includes('takeout') || types.includes('take-out')) { result.take_out_lat = lat; result.take_out_lon = lon; }
		}
		// Center: midpoint if both put-in and take-out; else fall back to whichever is present.
		if (result.put_in_lat != null && result.take_out_lat != null) {
			result.center_lat = (result.put_in_lat + result.take_out_lat!) / 2;
			result.center_lon = (result.put_in_lon! + result.take_out_lon!) / 2;
		} else if (result.put_in_lat != null) {
			result.center_lat = result.put_in_lat; result.center_lon = result.put_in_lon;
		} else if (result.take_out_lat != null) {
			result.center_lat = result.take_out_lat; result.center_lon = result.take_out_lon;
		}
	} catch {}
	return result;
}

async function fetchOne(reachId: string): Promise<ReachCoords> {
	try {
		const html = await fetchCached(DETAIL_URL(reachId), {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; FlowStatePipeline/1.0)',
				'Accept': 'text/html,application/xhtml+xml',
			},
		}, `aw-rd-${reachId}`);
		return extractCoords(html);
	} catch (err) {
		return { put_in_lat: null, put_in_lon: null, take_out_lat: null, take_out_lon: null, center_lat: null, center_lon: null };
	}
}

async function runWithConcurrency<T, R>(
	items: T[],
	worker: (item: T, idx: number) => Promise<R>,
	concurrency: number,
	onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let nextIdx = 0;
	let done = 0;
	const total = items.length;
	const workers: Promise<void>[] = [];
	for (let w = 0; w < concurrency; w++) {
		workers.push((async () => {
			while (true) {
				const i = nextIdx++;
				if (i >= total) return;
				results[i] = await worker(items[i], i);
				done++;
				if (onProgress && (done % 100 === 0 || done === total)) onProgress(done, total);
			}
		})());
	}
	await Promise.all(workers);
	return results;
}

export async function fetchReachCoords(reachIds: string[]): Promise<Map<string, ReachCoords>> {
	const cache = loadCoordsCache();
	const out = new Map<string, ReachCoords>();
	const todo: string[] = [];
	for (const id of reachIds) {
		const hit = cache[id];
		if (hit && hit !== 'miss') {
			out.set(id, hit);
		} else if (hit === 'miss') {
			out.set(id, { put_in_lat: null, put_in_lon: null, take_out_lat: null, take_out_lon: null, center_lat: null, center_lon: null });
		} else {
			todo.push(id);
		}
	}
	console.log(`[aw-detail] cache hits: ${out.size}, to fetch: ${todo.length}`);
	if (todo.length === 0) return out;

	let saveCounter = 0;
	const coordsList = await runWithConcurrency(todo, async (id) => {
		const c = await fetchOne(id);
		const anyCoord = c.put_in_lat != null || c.take_out_lat != null;
		cache[id] = anyCoord ? c : 'miss';
		saveCounter++;
		if (saveCounter % 500 === 0) saveCoordsCache();
		return { id, c };
	}, 8, (done, total) => {
		if (done % 200 === 0 || done === total) console.log(`[aw-detail] ${done}/${total}`);
	});
	saveCoordsCache();
	for (const { id, c } of coordsList) out.set(id, c);
	return out;
}
