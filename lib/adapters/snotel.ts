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

			const timestamps = new Set<string>();
			for (const d of [...sweData, ...depthData, ...precipData]) {
				timestamps.add(d.date);
			}

			for (const ts of timestamps) {
				const swe = sweData.find(d => d.date === ts);
				const depth = depthData.find(d => d.date === ts);
				const precip = precipData.find(d => d.date === ts);
				const isoTs = new Date(ts).toISOString();

				records.push({
					id: compositeId([triplet.replace(/:/g, '-'), isoTs]),
					basinId: triplet.replace(/:/g, '-'),
					timestamp: isoTs,
					sweInches: swe?.value ?? null,
					swePercentMedian: null,
					snowDepthInches: depth?.value ?? null,
					precipAccumInches: precip?.value ?? null,
					source: 'snotel',
				});
			}
		} catch (err) {
			console.error(`SNOTEL fetch failed for ${triplet}:`, err);
		}
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
		if (!Array.isArray(data) || data.length === 0) return [];
		const stationData = data[0];
		if (!stationData?.data) return [];

		return stationData.data
			.filter((d: any) => d.value != null && d.value >= 0)
			.map((d: any) => ({ date: d.date, value: d.value }));
	} catch {
		return [];
	}
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
