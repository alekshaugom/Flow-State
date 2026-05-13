/**
 * Generate accurate river geometries from NHDPlus HR.
 *
 * Queries the USGS NHDPlus HR MapServer (layer 3: NetworkNHDFlowline),
 * assembles flowline segments for each whitewater section, clips from
 * put-in to take-out, simplifies for web use, and writes out
 * app/src/lib/river-geometries.ts.
 *
 * Usage: npx tsx scripts/generate-geometries.ts
 */

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Types ────────────────────────────────────────────────────────────

type Coord = [number, number]; // [lng, lat]

interface BBox {
	xmin: number;
	ymin: number;
	xmax: number;
	ymax: number;
}

interface NHDFeature {
	type: 'Feature';
	properties: {
		OBJECTID: number;
		gnis_name: string;
		lengthkm: number;
		ftype: number;
		streamorde: number;
		hydroseq: number;
		levelpathi: number;
		fromnode: number;
		tonode: number;
	};
	geometry: {
		type: 'LineString';
		coordinates: Coord[];
	};
}

interface SectionConfig {
	id: string;
	gnisName: string;
	putIn: Coord;
	takeOut: Coord;
	bbox: BBox;
	lengthMiles: number;
}

// ── GNIS Name Mapping ────────────────────────────────────────────────

const GNIS_MAP: Record<string, string> = {
	'colorado': 'Colorado River',
	'arkansas': 'Arkansas River',
	'gunnison': 'Gunnison River',
	'taylor-river': 'Taylor River',
	'clear-creek': 'Clear Creek',
	'poudre': 'Cache la Poudre River',
	'animas': 'Animas River',
	'dolores': 'Dolores River',
	'san-miguel': 'San Miguel River',
	'eagle': 'Eagle River',
	'roaring-fork': 'Roaring Fork River',
	'yampa': 'Yampa River',
	'blue': 'Blue River',
	'piedra': 'Piedra River',
	'san-juan': 'San Juan River',
	'north-platte': 'North Platte River',
	'south-platte': 'South Platte River',
};

function gnisNameForSection(sectionId: string): string {
	const prefixes = Object.keys(GNIS_MAP).sort((a, b) => b.length - a.length);
	for (const prefix of prefixes) {
		if (sectionId.startsWith(prefix + '-') || sectionId === prefix) {
			return GNIS_MAP[prefix];
		}
	}
	throw new Error(`No GNIS mapping for section: ${sectionId}`);
}

// ── Geo Math ─────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

function haversineDistance(a: Coord, b: Coord): number {
	const [lng1, lat1] = a;
	const [lng2, lat2] = b;
	const dLat = (lat2 - lat1) * DEG_TO_RAD;
	const dLng = (lng2 - lng1) * DEG_TO_RAD;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h = sinLat * sinLat + Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * sinLng * sinLng;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function lineLength(coords: Coord[]): number {
	let total = 0;
	for (let i = 1; i < coords.length; i++) {
		total += haversineDistance(coords[i - 1], coords[i]);
	}
	return total;
}

interface Projection {
	index: number;
	fraction: number;
	point: Coord;
	distance: number;
}

function projectPointOnSegment(
	p: Coord,
	a: Coord,
	b: Coord,
): { fraction: number; point: Coord; distance: number } {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	if (dx === 0 && dy === 0) {
		return { fraction: 0, point: a, distance: haversineDistance(p, a) };
	}
	let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
	t = Math.max(0, Math.min(1, t));
	const proj: Coord = [a[0] + t * dx, a[1] + t * dy];
	return { fraction: t, point: proj, distance: haversineDistance(p, proj) };
}

function projectPointOnLine(point: Coord, coords: Coord[]): Projection {
	let best: Projection = { index: 0, fraction: 0, point: coords[0], distance: Infinity };
	for (let i = 0; i < coords.length - 1; i++) {
		const proj = projectPointOnSegment(point, coords[i], coords[i + 1]);
		if (proj.distance < best.distance) {
			best = { index: i, fraction: proj.fraction, point: proj.point, distance: proj.distance };
		}
	}
	return best;
}

function clipLine(coords: Coord[], from: Projection, to: Projection): Coord[] {
	let startIdx = from.index;
	let startFrac = from.fraction;
	let endIdx = to.index;
	let endFrac = to.fraction;

	if (startIdx > endIdx || (startIdx === endIdx && startFrac > endFrac)) {
		[startIdx, startFrac, endIdx, endFrac] = [endIdx, endFrac, startIdx, startFrac];
		const tmp = from;
		from = to;
		to = tmp;
	}

	const result: Coord[] = [];

	if (startFrac > 0 && startFrac < 1) {
		const a = coords[startIdx];
		const b = coords[startIdx + 1];
		result.push([
			a[0] + startFrac * (b[0] - a[0]),
			a[1] + startFrac * (b[1] - a[1]),
		]);
	} else if (startFrac === 0) {
		result.push(coords[startIdx]);
	} else {
		result.push(coords[startIdx + 1]);
	}

	const firstFullVertex = startFrac >= 1 ? startIdx + 2 : startIdx + 1;
	const lastFullVertex = endFrac <= 0 ? endIdx - 1 : endIdx;

	for (let i = firstFullVertex; i <= lastFullVertex; i++) {
		result.push(coords[i]);
	}

	if (endIdx === startIdx && Math.abs(endFrac - startFrac) < 1e-10) {
		return result;
	}

	if (endFrac > 0 && endFrac < 1) {
		const a = coords[endIdx];
		const b = coords[endIdx + 1];
		result.push([
			a[0] + endFrac * (b[0] - a[0]),
			a[1] + endFrac * (b[1] - a[1]),
		]);
	} else if (endFrac === 0) {
		if (result.length === 0 || result[result.length - 1] !== coords[endIdx]) {
			result.push(coords[endIdx]);
		}
	} else {
		if (result.length === 0 || result[result.length - 1] !== coords[endIdx + 1]) {
			result.push(coords[endIdx + 1]);
		}
	}

	return result;
}

// ── Douglas-Peucker Simplification ───────────────────────────────────

function perpendicularDistance(p: Coord, a: Coord, b: Coord): number {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2);
	return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function douglasPeucker(coords: Coord[], tolerance: number): Coord[] {
	if (coords.length <= 2) return coords;

	let maxDist = 0;
	let maxIdx = 0;
	const first = coords[0];
	const last = coords[coords.length - 1];

	for (let i = 1; i < coords.length - 1; i++) {
		const d = perpendicularDistance(coords[i], first, last);
		if (d > maxDist) {
			maxDist = d;
			maxIdx = i;
		}
	}

	if (maxDist > tolerance) {
		const left = douglasPeucker(coords.slice(0, maxIdx + 1), tolerance);
		const right = douglasPeucker(coords.slice(maxIdx), tolerance);
		return [...left.slice(0, -1), ...right];
	}
	return [first, last];
}

function simplifyAdaptive(coords: Coord[], targetMin: number, targetMax: number): Coord[] {
	let tolerance = 0.0002;
	let result = douglasPeucker(coords, tolerance);

	for (let i = 0; i < 10; i++) {
		if (result.length > targetMax) {
			tolerance *= 1.5;
			result = douglasPeucker(coords, tolerance);
		} else if (result.length < targetMin && tolerance > 0.00002) {
			tolerance *= 0.6;
			result = douglasPeucker(coords, tolerance);
		} else {
			break;
		}
	}

	return result;
}

// ── NHD API Client ───────────────────────────────────────────────────

const NHD_BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/3/query';
const MAX_RECORDS = 2000;

async function sleep(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url: string, retries = 3): Promise<any> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { 'Accept': 'application/json' },
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			const data = await res.json();
			if (data.error) throw new Error(`ArcGIS error: ${data.error.message}`);
			return data;
		} catch (err) {
			if (attempt === retries) throw err;
			console.warn(`  Retry ${attempt}/${retries}: ${(err as Error).message}`);
			await sleep(1000 * attempt);
		}
	}
}

async function queryNHDFlowlines(gnisName: string, bbox: BBox, useLike = false): Promise<NHDFeature[]> {
	const where = useLike
		? `gnis_name LIKE '%${gnisName.split(' ').pop()}%'`
		: `gnis_name='${gnisName}'`;

	const allFeatures: NHDFeature[] = [];
	let offset = 0;

	for (let page = 0; page < 10; page++) {
		const params = new URLSearchParams({
			where,
			geometry: JSON.stringify(bbox),
			geometryType: 'esriGeometryEnvelope',
			inSR: '4326',
			outSR: '4326',
			spatialRel: 'esriSpatialRelIntersects',
			outFields: 'OBJECTID,gnis_name,lengthkm,ftype,streamorde,hydroseq,levelpathi,fromnode,tonode',
			f: 'geojson',
			returnGeometry: 'true',
			resultRecordCount: String(MAX_RECORDS),
			resultOffset: String(offset),
		});

		const url = `${NHD_BASE}?${params}`;
		const data = await fetchJson(url);

		if (data.features) {
			allFeatures.push(...data.features);
		}

		if (!data.exceededTransferLimit && (!data.properties || !data.properties.exceededTransferLimit)) {
			break;
		}

		offset += MAX_RECORDS;
		await sleep(300);
	}

	return allFeatures;
}

// ── Flowline Assembly ────────────────────────────────────────────────

function featureMidpoint(f: NHDFeature): Coord {
	const coords = f.geometry.coordinates;
	const mid = Math.floor(coords.length / 2);
	return coords[mid];
}

function featureClosestDist(f: NHDFeature, point: Coord): number {
	let minDist = Infinity;
	for (const c of f.geometry.coordinates) {
		const d = haversineDistance(point, c);
		if (d < minDist) minDist = d;
	}
	return minDist;
}

function assembleFlowline(features: NHDFeature[], putIn: Coord, takeOut: Coord): Coord[] {
	const valid = features.filter(f =>
		(f.properties.ftype === 460 || f.properties.ftype === 558) &&
		f.geometry?.type === 'LineString' &&
		f.geometry.coordinates.length >= 2
	);

	if (valid.length === 0) return [];

	// Build node graph: tonode → feature (downstream navigation)
	// NHD: flowlines go upstream→downstream, fromnode is upstream end, tonode is downstream end
	// hydroseq: higher = further upstream
	const byFromNode = new Map<number, NHDFeature[]>();
	const byToNode = new Map<number, NHDFeature[]>();
	for (const f of valid) {
		const fn = f.properties.fromnode;
		const tn = f.properties.tonode;
		if (!byFromNode.has(fn)) byFromNode.set(fn, []);
		byFromNode.get(fn)!.push(f);
		if (!byToNode.has(tn)) byToNode.set(tn, []);
		byToNode.get(tn)!.push(f);
	}

	// Find the feature closest to put-in
	let startFeature = valid[0];
	let minDist = Infinity;
	for (const f of valid) {
		const d = featureClosestDist(f, putIn);
		if (d < minDist) {
			minDist = d;
			startFeature = f;
		}
	}

	// Find the feature closest to take-out
	let endFeature = valid[0];
	minDist = Infinity;
	for (const f of valid) {
		const d = featureClosestDist(f, takeOut);
		if (d < minDist) {
			minDist = d;
			endFeature = f;
		}
	}

	// Trace downstream from start to end using tonode→fromnode linkage
	const visited = new Set<number>();
	const path: NHDFeature[] = [startFeature];
	visited.add(startFeature.properties.OBJECTID);

	let current = startFeature;
	const maxSteps = valid.length + 10;
	let steps = 0;

	while (current.properties.OBJECTID !== endFeature.properties.OBJECTID && steps < maxSteps) {
		steps++;
		const downstream = byFromNode.get(current.properties.tonode);
		if (!downstream) break;

		// Pick the best downstream segment: prefer same GNIS name, then highest stream order
		let next: NHDFeature | null = null;
		let nextScore = -1;
		for (const f of downstream) {
			if (visited.has(f.properties.OBJECTID)) continue;
			let score = f.properties.streamorde * 100;
			if (f.properties.gnis_name === startFeature.properties.gnis_name) score += 1000;
			if (score > nextScore) {
				nextScore = score;
				next = f;
			}
		}

		if (!next) break;
		visited.add(next.properties.OBJECTID);
		path.push(next);
		current = next;
	}

	// If we didn't reach the end feature, try upstream tracing instead
	if (current.properties.OBJECTID !== endFeature.properties.OBJECTID) {
		// Maybe the put-in/take-out are swapped relative to flow direction
		// Try tracing upstream from start to find end
		const upVisited = new Set<number>();
		const upPath: NHDFeature[] = [startFeature];
		upVisited.add(startFeature.properties.OBJECTID);
		let upCurrent = startFeature;
		steps = 0;

		while (upCurrent.properties.OBJECTID !== endFeature.properties.OBJECTID && steps < maxSteps) {
			steps++;
			const upstream = byToNode.get(upCurrent.properties.fromnode);
			if (!upstream) break;

			let next: NHDFeature | null = null;
			let nextScore = -1;
			for (const f of upstream) {
				if (upVisited.has(f.properties.OBJECTID)) continue;
				let score = f.properties.streamorde * 100;
				if (f.properties.gnis_name === startFeature.properties.gnis_name) score += 1000;
				if (score > nextScore) {
					nextScore = score;
					next = f;
				}
			}

			if (!next) break;
			upVisited.add(next.properties.OBJECTID);
			upPath.push(next);
			upCurrent = next;
		}

		if (upCurrent.properties.OBJECTID === endFeature.properties.OBJECTID) {
			// Upstream trace worked — reverse to get downstream order
			path.length = 0;
			path.push(...upPath.reverse());
		}
	}

	// If graph traversal didn't connect start to end, fall back to hydroseq sorting
	// of the best level path group
	if (path.length < 2 || (current.properties.OBJECTID !== endFeature.properties.OBJECTID && path[path.length - 1].properties.OBJECTID !== endFeature.properties.OBJECTID)) {
		console.log(`  Graph traversal incomplete, falling back to level path sort`);
		const byLevelPath = new Map<number, NHDFeature[]>();
		for (const f of valid) {
			const lp = f.properties.levelpathi;
			if (!byLevelPath.has(lp)) byLevelPath.set(lp, []);
			byLevelPath.get(lp)!.push(f);
		}

		let bestPath: NHDFeature[] = [];
		let bestScore = -1;
		for (const [, group] of byLevelPath) {
			const maxOrder = Math.max(...group.map(f => f.properties.streamorde));
			const totalLen = group.reduce((s, f) => s + f.properties.lengthkm, 0);
			const score = maxOrder * 1000 + totalLen;
			if (score > bestScore) {
				bestScore = score;
				bestPath = group;
			}
		}

		bestPath.sort((a, b) => b.properties.hydroseq - a.properties.hydroseq);
		path.length = 0;
		path.push(...bestPath);
	}

	// Concatenate coordinates, respecting segment direction
	const coords: Coord[] = [];
	for (const feature of path) {
		const segCoords = feature.geometry.coordinates;
		if (coords.length === 0) {
			coords.push(...segCoords);
			continue;
		}

		const lastPt = coords[coords.length - 1];
		const fwdDist = haversineDistance(lastPt, segCoords[0]);
		const revDist = haversineDistance(lastPt, segCoords[segCoords.length - 1]);

		const useReverse = revDist < fwdDist;
		const ordered = useReverse ? [...segCoords].reverse() : segCoords;
		const gap = haversineDistance(lastPt, ordered[0]);

		if (gap < 100) {
			coords.push(...ordered.slice(1));
		} else {
			coords.push(...ordered);
		}
	}

	return coords;
}

// ── Section Config Builder ───────────────────────────────────────────

async function buildSectionConfigs(): Promise<SectionConfig[]> {
	const geoPath = resolve(PROJECT_ROOT, 'app/src/lib/river-geometries.ts');
	const seedPath = resolve(PROJECT_ROOT, 'lib/seed-data.ts');

	const geoModule = await import(geoPath);
	const seedModule = await import(seedPath);

	const geometries: Record<string, Coord[]> = geoModule.RIVER_GEOMETRIES;
	const sections: any[] = seedModule.SECTIONS;

	const configs: SectionConfig[] = [];

	for (const section of sections) {
		const geo = geometries[section.id];
		if (!geo || geo.length < 2) {
			console.warn(`No existing geometry for ${section.id}, skipping`);
			continue;
		}

		const putIn = geo[0];
		const takeOut = geo[geo.length - 1];

		const allLngs = geo.map(c => c[0]);
		const allLats = geo.map(c => c[1]);
		const buffer = Math.max(0.1, Math.min(0.5, section.lengthMiles * 0.008));

		configs.push({
			id: section.id,
			gnisName: gnisNameForSection(section.id),
			putIn,
			takeOut,
			bbox: {
				xmin: Math.min(...allLngs) - buffer,
				ymin: Math.min(...allLats) - buffer,
				xmax: Math.max(...allLngs) + buffer,
				ymax: Math.max(...allLats) + buffer,
			},
			lengthMiles: section.lengthMiles,
		});
	}

	return configs;
}

// ── Output Writer ────────────────────────────────────────────────────

const RIVER_GROUPS: [string, string][] = [
	['colorado', 'COLORADO RIVER'],
	['arkansas', 'ARKANSAS RIVER'],
	['gunnison', 'GUNNISON RIVER'],
	['taylor-river', 'TAYLOR RIVER'],
	['clear-creek', 'CLEAR CREEK'],
	['poudre', 'CACHE LA POUDRE'],
	['animas', 'ANIMAS RIVER'],
	['dolores', 'DOLORES RIVER'],
	['san-miguel', 'SAN MIGUEL RIVER'],
	['eagle', 'EAGLE RIVER'],
	['roaring-fork', 'ROARING FORK'],
	['yampa', 'YAMPA RIVER'],
	['blue', 'BLUE RIVER'],
	['piedra', 'PIEDRA RIVER'],
	['san-juan', 'SAN JUAN RIVER'],
	['north-platte', 'NORTH PLATTE'],
	['south-platte', 'SOUTH PLATTE'],
];

function formatOutput(results: Map<string, Coord[]>): string {
	const lines: string[] = [];
	lines.push(`/**`);
	lines.push(` * River section geometries from NHDPlus HR (USGS National Hydrography Dataset).`);
	lines.push(` * Generated ${new Date().toISOString().split('T')[0]} via scripts/generate-geometries.ts`);
	lines.push(` * Source: https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer`);
	lines.push(` *`);
	lines.push(` * Each entry maps a section ID to [longitude, latitude] coordinate pairs`);
	lines.push(` * tracing the river path from put-in to take-out (downstream order).`);
	lines.push(` */`);
	lines.push(`export const RIVER_GEOMETRIES: Record<string, [number, number][]> = {`);

	for (const [prefix, label] of RIVER_GROUPS) {
		const sectionIds = [...results.keys()].filter(id =>
			id.startsWith(prefix + '-') || id === prefix
		);
		if (sectionIds.length === 0) continue;

		lines.push('');
		lines.push(`  // ${'═'.repeat(60)}`);
		lines.push(`  // ${label}`);
		lines.push(`  // ${'═'.repeat(60)}`);

		for (const id of sectionIds) {
			const coords = results.get(id)!;
			lines.push('');
			lines.push(`  '${id}': [`);
			for (const [lng, lat] of coords) {
				lines.push(`    [${lng.toFixed(5)}, ${lat.toFixed(5)}],`);
			}
			lines.push(`  ],`);
		}
	}

	lines.push(`};`);
	lines.push('');
	return lines.join('\n');
}

// ── Validation ───────────────────────────────────────────────────────

interface ValidationResult {
	id: string;
	status: 'ok' | 'warn' | 'fail';
	oldPoints: number;
	newPoints: number;
	lengthMi: number;
	expectedMi: number;
	notes: string[];
}

function validate(
	id: string,
	oldCoords: Coord[],
	newCoords: Coord[],
	expectedMiles: number,
): ValidationResult {
	const notes: string[] = [];
	let status: 'ok' | 'warn' | 'fail' = 'ok';

	const newLenM = lineLength(newCoords);
	const newLenMi = newLenM / 1609.34;

	if (newCoords.length < 10) {
		notes.push(`Very few points (${newCoords.length})`);
		status = 'warn';
	}
	if (newCoords.length > 300) {
		notes.push(`Many points (${newCoords.length})`);
		status = 'warn';
	}

	const startDist = haversineDistance(oldCoords[0], newCoords[0]);
	const endDist = haversineDistance(oldCoords[oldCoords.length - 1], newCoords[newCoords.length - 1]);
	if (startDist > 3000) {
		notes.push(`Start drifted ${(startDist / 1000).toFixed(1)}km`);
		status = 'warn';
	}
	if (endDist > 3000) {
		notes.push(`End drifted ${(endDist / 1000).toFixed(1)}km`);
		status = 'warn';
	}

	if (expectedMiles > 0) {
		const ratio = newLenMi / expectedMiles;
		if (ratio < 0.4 || ratio > 3.0) {
			notes.push(`Length ratio ${ratio.toFixed(2)}x expected`);
			status = 'warn';
		}
	}

	if (notes.length === 0) notes.push('OK');

	return {
		id,
		status,
		oldPoints: oldCoords.length,
		newPoints: newCoords.length,
		lengthMi: Math.round(newLenMi * 10) / 10,
		expectedMi: expectedMiles,
		notes,
	};
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
	console.log('NHDPlus HR Geometry Generator');
	console.log('=============================\n');

	console.log('Loading section configurations...');
	const configs = await buildSectionConfigs();
	console.log(`Found ${configs.length} sections\n`);

	const geoModule = await import(resolve(PROJECT_ROOT, 'app/src/lib/river-geometries.ts'));
	const oldGeometries: Record<string, Coord[]> = geoModule.RIVER_GEOMETRIES;

	const results = new Map<string, Coord[]>();
	const validations: ValidationResult[] = [];
	let successCount = 0;
	let fallbackCount = 0;

	for (let i = 0; i < configs.length; i++) {
		const config = configs[i];
		console.log(`[${i + 1}/${configs.length}] ${config.id} (${config.gnisName})...`);

		try {
			let features = await queryNHDFlowlines(config.gnisName, config.bbox);

			if (features.length === 0) {
				console.log(`  No features found, trying LIKE query...`);
				features = await queryNHDFlowlines(config.gnisName, config.bbox, true);
			}

			if (features.length === 0) {
				console.log(`  Still no features, expanding bbox...`);
				const expandedBbox: BBox = {
					xmin: config.bbox.xmin - 0.1,
					ymin: config.bbox.ymin - 0.1,
					xmax: config.bbox.xmax + 0.1,
					ymax: config.bbox.ymax + 0.1,
				};
				features = await queryNHDFlowlines(config.gnisName, expandedBbox);
			}

			if (features.length === 0) {
				throw new Error('No flowline features found after all attempts');
			}

			console.log(`  Fetched ${features.length} flowline segments`);

			const assembled = assembleFlowline(features, config.putIn, config.takeOut);
			if (assembled.length < 2) {
				throw new Error('Could not assemble a connected flowline');
			}
			console.log(`  Assembled ${assembled.length} points`);

			const putInProj = projectPointOnLine(config.putIn, assembled);
			const takeOutProj = projectPointOnLine(config.takeOut, assembled);

			console.log(`  Put-in projection: ${putInProj.distance.toFixed(0)}m from line`);
			console.log(`  Take-out projection: ${takeOutProj.distance.toFixed(0)}m from line`);

			if (putInProj.distance > 25000 || takeOutProj.distance > 25000) {
				throw new Error(
					`Projection too far from flowline: put-in=${putInProj.distance.toFixed(0)}m, take-out=${takeOutProj.distance.toFixed(0)}m`
				);
			}

			let clipped = clipLine(assembled, putInProj, takeOutProj);
			if (clipped.length < 2) {
				throw new Error('Clipped line has fewer than 2 points');
			}

			const simplified = simplifyAdaptive(clipped, 30, 200);
			const rounded: Coord[] = simplified.map(([lng, lat]) => [
				Math.round(lng * 100000) / 100000,
				Math.round(lat * 100000) / 100000,
			]);

			console.log(`  Simplified: ${clipped.length} → ${rounded.length} points`);

			results.set(config.id, rounded);
			successCount++;

			const v = validate(config.id, oldGeometries[config.id] || [], rounded, config.lengthMiles);
			validations.push(v);

		} catch (err) {
			console.error(`  FAILED: ${(err as Error).message}`);
			console.log(`  Falling back to existing geometry`);
			const fallback = oldGeometries[config.id];
			if (fallback) {
				results.set(config.id, fallback);
				fallbackCount++;
				validations.push({
					id: config.id,
					status: 'fail',
					oldPoints: fallback.length,
					newPoints: fallback.length,
					lengthMi: Math.round(lineLength(fallback) / 1609.34 * 10) / 10,
					expectedMi: config.lengthMiles,
					notes: [`Fallback: ${(err as Error).message}`],
				});
			}
		}

		if (i < configs.length - 1) {
			await sleep(500);
		}
	}

	console.log('\n\nWriting output...');
	const output = formatOutput(results);
	const outputPath = resolve(PROJECT_ROOT, 'app/src/lib/river-geometries.ts');
	await writeFile(outputPath, output, 'utf-8');
	console.log(`Wrote ${outputPath} (${(output.length / 1024).toFixed(1)} KB)\n`);

	console.log('Validation Report');
	console.log('=================');
	console.log(
		'Section'.padEnd(35) +
		'Old'.padStart(5) +
		'New'.padStart(5) +
		'Mi'.padStart(7) +
		'Exp'.padStart(7) +
		'  Status  Notes'
	);
	console.log('-'.repeat(100));

	for (const v of validations) {
		console.log(
			v.id.padEnd(35) +
			String(v.oldPoints).padStart(5) +
			String(v.newPoints).padStart(5) +
			v.lengthMi.toFixed(1).padStart(7) +
			v.expectedMi.toFixed(1).padStart(7) +
			`  ${v.status.padEnd(6)}  ${v.notes.join('; ')}`
		);
	}

	console.log('-'.repeat(100));
	console.log(`\nSuccess: ${successCount}  Fallback: ${fallbackCount}  Total: ${configs.length}`);

	if (fallbackCount > 0) {
		console.log('\n⚠ Some sections fell back to existing geometry. Review warnings above.');
	}
}

main().catch(err => {
	console.error('\nFatal error:', err);
	process.exit(1);
});
