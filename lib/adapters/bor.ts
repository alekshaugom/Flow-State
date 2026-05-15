import { fetchWithRetry, compositeId, isoDate, daysAgo, tomorrow } from '../utils.ts';

const BOR_RISE_BASE = 'https://data.usbr.gov/rise/api/result';

export interface DamReleaseRecord {
	id: string;
	reservoirId: string;
	timestamp: string;
	outflowCfs: number | null;
	inflowCfs: number | null;
	storageAcreFt: number | null;
	elevationFt: number | null;
	source: string;
}

// Bureau of Reclamation RISE API catalog for Colorado reservoirs.
//
// IDs verified against the live BOR RISE catalog on 2026-05-15 (see slice 03a).
// Method: paginated /rise/api/location?locationTypeName=Lake/Reservoir, then walked each
// location's relationships.catalogRecords → catalogItems and matched by parameterName.
//
// Not in BOR RISE (need alternative sources):
//   - Aspinall Unit (Blue Mesa, Morrow Point, Crystal Dam) — Western Area Power Admin / CDSS
//   - Taylor Park Reservoir — CDSS
//   - McPhee Reservoir (Dolores Water Conservancy / Dolores Project) — DWCD direct
//   - Dillon Reservoir (Denver Water, not federal) — Denver Water "operations report"
// The seed data references these by id; sections will simply have no DamRelease data for
// them until a CDSS-reservoir adapter (or per-source adapter) lands. Slice 04 forecaster
// can fall back to gauges-below-dam (USGS) for dam-fed sections without RISE coverage.
export const BOR_CATALOG: Record<string, { name: string; locationId: string; timeseriesIds: Record<string, string> }> = {
	'green-mountain': {
		name: 'Green Mountain Reservoir',
		locationId: '353',
		timeseriesIds: { storage: '21', elevation: '22', outflow: '23' },
	},
	'pueblo': {
		name: 'Pueblo Reservoir',
		locationId: '445',
		timeseriesIds: { storage: '681', elevation: '682', outflow: '684' },
	},
	'ruedi': {
		name: 'Ruedi Reservoir',
		locationId: '456',
		timeseriesIds: { storage: '711', elevation: '712', outflow: '716' },
	},
	'turquoise-lake': {
		name: 'Turquoise Lake',
		locationId: '498',
		timeseriesIds: { storage: '814', elevation: '815', outflow: '817' },
	},
	'twin-lakes': {
		name: 'Twin Lakes Reservoir',
		locationId: '499',
		timeseriesIds: { storage: '818', elevation: '819', outflow: '823' },
	},
};

/**
 * Parses a BOR RISE `/result/download` response into a date → value map.
 *
 * Response shape can be either:
 *  - An array: `[{dateTime, result, ...}, ...]` (older shape)
 *  - An object with numbered string keys plus metadata: `{"0": {...}, "1": {...}, "Location": {...}, "Timezone": "MT", ...}`
 *
 * If the response includes a `Location.Name` that doesn't match `expectedName`,
 * a warning is logged — that's the signal that the itemId is mapped to the wrong reservoir.
 *
 * Keyed by YYYY-MM-DD (UTC-derived from the UTC timestamp BOR returns).
 */
export function parseRiseDownloadResponse(data: any, expectedName?: string, tsId?: string): Map<string, number> {
	const map = new Map<string, number>();
	if (!data) return map;

	const rows: Array<{ dateTime?: string; result?: number | null }> = Array.isArray(data)
		? data
		: Object.entries(data)
			.filter(([k]) => /^\d+$/.test(k))
			.map(([, v]) => v as any);

	const responseLocation = !Array.isArray(data) ? (data as any)?.Location?.Name : null;
	if (responseLocation && expectedName) {
		const expectedFirst = expectedName.split(/\s+/)[0].toLowerCase();
		if (!responseLocation.toLowerCase().includes(expectedFirst)) {
			console.warn(`[bor] itemId=${tsId ?? '?'} mapped to "${expectedName}" returned data for "${responseLocation}" — likely stale catalog`);
		}
	}

	for (const row of rows) {
		if (row.result != null && row.dateTime) {
			const ts = new Date(row.dateTime).toISOString().split('T')[0];
			map.set(ts, row.result);
		}
	}
	return map;
}

export async function fetchReservoirData(
	reservoirKey: string,
	startDate?: Date,
	endDate?: Date
): Promise<DamReleaseRecord[]> {
	const catalog = BOR_CATALOG[reservoirKey];
	if (!catalog) return [];

	const start = isoDate(startDate || daysAgo(7));
	const end = isoDate(endDate || tomorrow());
	const records: DamReleaseRecord[] = [];

	const fetchParam = async (tsId: string): Promise<Map<string, number>> => {
		try {
			const url = `${BOR_RISE_BASE}/download?type=json&itemId=${tsId}&after=${start}&before=${end}&order=ASC`;
			const data = await fetchWithRetry(url);
			return parseRiseDownloadResponse(data, catalog.name, tsId);
		} catch (err) {
			console.error(`BOR fetch failed for timeseries ${tsId}:`, err);
			return new Map();
		}
	};

	const [storageMap, elevationMap, inflowMap, outflowMap] = await Promise.all([
		catalog.timeseriesIds.storage ? fetchParam(catalog.timeseriesIds.storage) : Promise.resolve(new Map()),
		catalog.timeseriesIds.elevation ? fetchParam(catalog.timeseriesIds.elevation) : Promise.resolve(new Map()),
		catalog.timeseriesIds.inflow ? fetchParam(catalog.timeseriesIds.inflow) : Promise.resolve(new Map()),
		catalog.timeseriesIds.outflow ? fetchParam(catalog.timeseriesIds.outflow) : Promise.resolve(new Map()),
	]);

	const allDates = new Set<string>();
	for (const m of [storageMap, elevationMap, inflowMap, outflowMap]) {
		for (const d of m.keys()) allDates.add(d);
	}

	for (const date of allDates) {
		const isoTs = new Date(date).toISOString();
		records.push({
			id: compositeId([reservoirKey, isoTs]),
			reservoirId: reservoirKey,
			timestamp: isoTs,
			outflowCfs: outflowMap.get(date) ?? null,
			inflowCfs: inflowMap.get(date) ?? null,
			storageAcreFt: storageMap.get(date) ?? null,
			elevationFt: elevationMap.get(date) ?? null,
			source: 'bor-rise',
		});
	}
	return records;
}

export async function fetchAllColoradoReservoirs(days = 7): Promise<Map<string, DamReleaseRecord[]>> {
	const result = new Map<string, DamReleaseRecord[]>();
	for (const key of Object.keys(BOR_CATALOG)) {
		const records = await fetchReservoirData(key, daysAgo(days));
		if (records.length > 0) result.set(key, records);
	}
	return result;
}
