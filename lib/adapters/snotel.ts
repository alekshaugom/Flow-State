import { fetchWithRetry, compositeId, isoDate, daysAgo, tomorrow } from '../utils.ts';

const AWDB_BASE = 'https://wcc.sc.egov.usda.gov/awdbRestApi';

export interface SnowpackReadingRecord {
	id: string;
	basinId: string;
	timestamp: string;
	sweInches: number | null;
	swePercentMedian: number | null;
	snowDepthInches: number | null;
	precipAccumInches: number | null;
	source: string;
}

export async function fetchBasinSnowData(
	basinId: string,
	stationTriplets: string[],
	startDate?: Date,
	endDate?: Date
): Promise<SnowpackReadingRecord[]> {
	const start = isoDate(startDate || daysAgo(7));
	const end = isoDate(endDate || tomorrow());

	const records: SnowpackReadingRecord[] = [];

	for (const triplet of stationTriplets) {
		try {
			const sweData = await fetchStationData(triplet, 'WTEQ', start, end);
			const depthData = await fetchStationData(triplet, 'SNWD', start, end);
			const precipData = await fetchStationData(triplet, 'PREC', start, end);
			records.push(...buildSnowpackRecords(basinId, triplet, sweData, depthData, precipData));
		} catch (err) {
			console.error(`SNOTEL fetch failed for ${triplet} (basin ${basinId}):`, err);
		}
	}
	return records;
}

/**
 * Pure builder that turns per-element station readings into `SnowpackReadingRecord`s
 * stamped with the **logical** basin id (not the station triplet — see L004 / SNOTEL adapter fix).
 * Exported for testing.
 */
export function buildSnowpackRecords(
	basinId: string,
	triplet: string,
	sweData: Array<{ date: string; value: number }>,
	depthData: Array<{ date: string; value: number }>,
	precipData: Array<{ date: string; value: number }>,
): SnowpackReadingRecord[] {
	const records: SnowpackReadingRecord[] = [];
	const stationKey = triplet.replace(/:/g, '-');

	const timestamps = new Set<string>();
	for (const d of [...sweData, ...depthData, ...precipData]) timestamps.add(d.date);

	for (const ts of timestamps) {
		const swe = sweData.find(d => d.date === ts);
		const depth = depthData.find(d => d.date === ts);
		const precip = precipData.find(d => d.date === ts);
		const isoTs = new Date(ts).toISOString();

		records.push({
			id: compositeId([basinId, stationKey, isoTs]),
			basinId,
			timestamp: isoTs,
			sweInches: swe?.value ?? null,
			swePercentMedian: null,
			snowDepthInches: depth?.value ?? null,
			precipAccumInches: precip?.value ?? null,
			source: 'snotel',
		});
	}

	return records;
}

async function fetchStationData(
	triplet: string,
	element: string,
	startDate: string,
	endDate: string
): Promise<Array<{ date: string; value: number }>> {
	const url = `${AWDB_BASE}/services/v1/data?stationTriplets=${encodeURIComponent(triplet)}&elements=${element}&beginDate=${startDate}&endDate=${endDate}&duration=DAILY`;
	try {
		const data = await fetchWithRetry(url);
		return parseAwdbResponse(data);
	} catch {
		return [];
	}
}

/**
 * Parses an AWDB `/data` response into a flat `{date, value}[]` for one element.
 *
 * Response shape:
 *   `[ { stationTriplet, data: [ { stationElement, values: [ {date, value}, ... ] } ] } ]`
 *
 * The previous version of this function flattened the wrong level of the response
 * (it iterated `stationData.data` looking for `{date, value}` directly), which silently
 * produced zero readings on every call. Exported for testing.
 */
export function parseAwdbResponse(data: any): Array<{ date: string; value: number }> {
	if (!Array.isArray(data) || data.length === 0) return [];
	const stationData = data[0];
	const elementBlocks = stationData?.data;
	if (!Array.isArray(elementBlocks) || elementBlocks.length === 0) return [];

	// Concatenate values from every element block (usually just one per request).
	const out: Array<{ date: string; value: number }> = [];
	for (const block of elementBlocks) {
		const values = block?.values;
		if (!Array.isArray(values)) continue;
		for (const v of values) {
			if (v?.value != null && v.value >= 0 && v.date) {
				out.push({ date: v.date, value: v.value });
			}
		}
	}
	return out;
}

export async function fetchCurrentSnowpackSummary(huc?: string): Promise<any> {
	const url = huc
		? `${AWDB_BASE}/services/v1/data?huc=${huc}&elements=WTEQ&duration=DAILY&getLatest=true`
		: `${AWDB_BASE}/services/v1/data?stateCode=CO&elements=WTEQ&duration=DAILY&getLatest=true`;
	return fetchWithRetry(url);
}

export async function fetchStationMetadata(stateCode = 'CO'): Promise<any[]> {
	const url = `${AWDB_BASE}/services/v1/stations?stateCode=${stateCode}&networkCode=SNTL`;
	try {
		return await fetchWithRetry(url);
	} catch {
		return [];
	}
}

// Colorado SNOTEL basin HUC mappings for common rafting watersheds
export const COLORADO_BASINS: Record<string, { name: string; huc: string; triplets: string[] }> = {
	'upper-colorado-headwaters': {
		name: 'Upper Colorado Headwaters',
		huc: '14010001',
		triplets: ['412:CO:SNTL', '485:CO:SNTL', '415:CO:SNTL'],
	},
	'blue-river': {
		name: 'Blue River Basin',
		huc: '14010002',
		triplets: ['485:CO:SNTL', '505:CO:SNTL'],
	},
	'eagle-river': {
		name: 'Eagle River Basin',
		huc: '14010003',
		triplets: ['842:CO:SNTL', '738:CO:SNTL'],
	},
	'roaring-fork': {
		name: 'Roaring Fork Basin',
		huc: '14010004',
		triplets: ['542:CO:SNTL', '380:CO:SNTL'],
	},
	'gunnison-river': {
		name: 'Gunnison River Basin',
		huc: '14020001',
		triplets: ['680:CO:SNTL', '737:CO:SNTL', '415:CO:SNTL'],
	},
	'arkansas-headwaters': {
		name: 'Arkansas Headwaters',
		huc: '11020001',
		triplets: ['369:CO:SNTL', '531:CO:SNTL'],
	},
	'south-platte-headwaters': {
		name: 'South Platte Headwaters',
		huc: '10190001',
		triplets: ['485:CO:SNTL', '412:CO:SNTL'],
	},
	'cache-la-poudre': {
		name: 'Cache la Poudre Basin',
		huc: '10190007',
		triplets: ['551:CO:SNTL', '412:CO:SNTL'],
	},
	'yampa-river': {
		name: 'Yampa River Basin',
		huc: '14050001',
		triplets: ['802:CO:SNTL', '709:CO:SNTL'],
	},
	'san-juan-dolores': {
		name: 'San Juan / Dolores Basin',
		huc: '14080101',
		triplets: ['586:CO:SNTL', '632:CO:SNTL', '713:CO:SNTL'],
	},
	'animas-river': {
		name: 'Animas River Basin',
		huc: '14080104',
		triplets: ['586:CO:SNTL', '632:CO:SNTL'],
	},
	'north-platte': {
		name: 'North Platte Headwaters',
		huc: '10180001',
		triplets: ['551:CO:SNTL'],
	},
};
