import { tables } from 'harper';

export interface CorridorRow {
	id: string;
	watershedId: string;
	riverId: string;
	name: string;
	shortName: string | null;
	description: string | null;
	summaryMd: string | null;
	summaryUpdatedAt: string | null;
	geometryJson: string | null;
	governingReservoirIds: string | null;
	primaryGaugeId: string | null;
	driver: string | null;
}

let _corridorsCache: CorridorRow[] | null = null;
let _corridorsCacheLoadedAt = 0;
const CORRIDORS_CACHE_TTL_MS = 5 * 60_000;

async function loadAllCorridors(): Promise<CorridorRow[]> {
	if (_corridorsCache && (Date.now() - _corridorsCacheLoadedAt) < CORRIDORS_CACHE_TTL_MS) {
		return _corridorsCache;
	}
	const out: CorridorRow[] = [];
	for await (const c of tables.RiverCorridor.search({ conditions: [] })) {
		out.push(c as CorridorRow);
	}
	// L004 refinement: never cache an empty scan — see lib/watersheds.ts.
	if (out.length > 0) {
		_corridorsCache = out;
		_corridorsCacheLoadedAt = Date.now();
	}
	return out;
}

export function invalidateCorridorsCache() {
	_corridorsCache = null;
	_corridorsCacheLoadedAt = 0;
}

export async function listCorridors(): Promise<CorridorRow[]> {
	return loadAllCorridors();
}

export async function getCorridorById(id: string): Promise<CorridorRow | null> {
	const all = await loadAllCorridors();
	return all.find(c => c.id === id) || null;
}

export async function getCorridorsForWatershed(watershedId: string): Promise<CorridorRow[]> {
	const all = await loadAllCorridors();
	return all.filter(c => c.watershedId === watershedId);
}
