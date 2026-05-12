import { fetchWithRetry, compositeId, isoDate, daysAgo } from '../utils.ts';

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

// Bureau of Reclamation RISE API catalog IDs for Colorado reservoirs
export const BOR_CATALOG: Record<string, { name: string; locationId: string; timeseriesIds: Record<string, string> }> = {
	'blue-mesa': {
		name: 'Blue Mesa Reservoir',
		locationId: '913',
		timeseriesIds: { storage: '509', elevation: '510', inflow: '511', outflow: '512' },
	},
	'morrow-point': {
		name: 'Morrow Point Reservoir',
		locationId: '915',
		timeseriesIds: { storage: '517', elevation: '518', outflow: '520' },
	},
	'crystal-dam': {
		name: 'Crystal Reservoir',
		locationId: '914',
		timeseriesIds: { storage: '513', elevation: '514', outflow: '516' },
	},
	'taylor-park': {
		name: 'Taylor Park Reservoir',
		locationId: '916',
		timeseriesIds: { storage: '521', elevation: '522', outflow: '524' },
	},
	'pueblo': {
		name: 'Pueblo Reservoir',
		locationId: '919',
		timeseriesIds: { storage: '529', elevation: '530', inflow: '531', outflow: '532' },
	},
	'twin-lakes': {
		name: 'Twin Lakes Reservoir',
		locationId: '920',
		timeseriesIds: { storage: '533', elevation: '534', outflow: '536' },
	},
	'turquoise-lake': {
		name: 'Turquoise Lake',
		locationId: '918',
		timeseriesIds: { storage: '525', elevation: '526', outflow: '528' },
	},
	'green-mountain': {
		name: 'Green Mountain Reservoir',
		locationId: '912',
		timeseriesIds: { storage: '505', elevation: '506', inflow: '507', outflow: '508' },
	},
	'dillon': {
		name: 'Dillon Reservoir',
		locationId: '911',
		timeseriesIds: { storage: '501', elevation: '502', outflow: '504' },
	},
	'ruedi': {
		name: 'Ruedi Reservoir',
		locationId: '917',
		timeseriesIds: { elevation: '523' },
	},
	'mcphee': {
		name: 'McPhee Reservoir',
		locationId: '921',
		timeseriesIds: { storage: '537', elevation: '538', outflow: '540' },
	},
};

export async function fetchReservoirData(
	reservoirKey: string,
	startDate?: Date,
	endDate?: Date
): Promise<DamReleaseRecord[]> {
	const catalog = BOR_CATALOG[reservoirKey];
	if (!catalog) return [];

	const start = isoDate(startDate || daysAgo(7));
	const end = isoDate(endDate || new Date());
	const records: DamReleaseRecord[] = [];

	const fetchParam = async (tsId: string): Promise<Map<string, number>> => {
		const map = new Map<string, number>();
		try {
			const url = `${BOR_RISE_BASE}/download?type=json&itemId=${tsId}&after=${start}&before=${end}&order=ASC`;
			const data = await fetchWithRetry(url);
			if (Array.isArray(data)) {
				for (const row of data) {
					if (row.result != null) {
						const ts = new Date(row.dateTime).toISOString().split('T')[0];
						map.set(ts, row.result);
					}
				}
			}
		} catch (err) {
			console.error(`BOR fetch failed for timeseries ${tsId}:`, err);
		}
		return map;
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
