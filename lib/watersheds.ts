import { tables } from 'harper';

export interface WatershedRow {
	id: string;
	name: string;
	region: string | null;
	state: string | null;
	description: string | null;
	summaryMd: string | null;
	summaryUpdatedAt: string | null;
	dominantDriver: string | null;
	peakRunoffMonth: number | null;
	hucCode: string | null;
	bboxJson: string | null;
}

// Module-scope cache: same pattern as lib/flow-bands.ts. Watersheds and
// corridors are small, slow-changing reference tables; full-scan + in-memory
// filter sidesteps the post-restart filtered-search lag we saw on Fabric (L004).
let _watershedsCache: WatershedRow[] | null = null;
let _watershedsCacheLoadedAt = 0;
const WATERSHEDS_CACHE_TTL_MS = 5 * 60_000;

async function loadAllWatersheds(): Promise<WatershedRow[]> {
	if (_watershedsCache && (Date.now() - _watershedsCacheLoadedAt) < WATERSHEDS_CACHE_TTL_MS) {
		return _watershedsCache;
	}
	const out: WatershedRow[] = [];
	for await (const w of tables.Watershed.search({ conditions: [] })) {
		out.push(w as WatershedRow);
	}
	_watershedsCache = out;
	_watershedsCacheLoadedAt = Date.now();
	return out;
}

export function invalidateWatershedsCache() {
	_watershedsCache = null;
	_watershedsCacheLoadedAt = 0;
}

export async function listWatersheds(): Promise<WatershedRow[]> {
	return loadAllWatersheds();
}

export async function getWatershedById(id: string): Promise<WatershedRow | null> {
	const all = await loadAllWatersheds();
	return all.find(w => w.id === id) || null;
}
