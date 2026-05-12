import { fetchWithRetry, compositeId, isoDate, daysAgo } from '../utils.ts';

const API_BASE = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections';
const DISCHARGE = '00060';

interface OGCFeature {
	properties: {
		monitoring_location_id: string;
		parameter_code: string;
		time: string;
		value: string;
		unit_of_measure: string;
		approval_status: string;
		qualifier: string | null;
	};
}

interface OGCResponse {
	type: string;
	features: OGCFeature[];
	numberReturned: number;
	links: Array<{ rel: string; href: string }>;
}

export interface GaugeReadingRecord {
	id: string;
	gaugeId: string;
	timestamp: string;
	value: number;
	unit: string;
	qualityFlag: string;
	source: string;
}

function siteParam(siteIds: string[]): string {
	return siteIds.map(id => id.startsWith('USGS-') ? id : `USGS-${id}`).join(',');
}

function parseFeatures(data: OGCResponse, source: string): GaugeReadingRecord[] {
	if (!data?.features) return [];
	const records: GaugeReadingRecord[] = [];

	for (const f of data.features) {
		const p = f.properties;
		if (p.parameter_code !== DISCHARGE) continue;

		const val = parseFloat(p.value);
		if (isNaN(val) || val < 0) continue;

		const locId = p.monitoring_location_id;
		const siteCode = locId.startsWith('USGS-') ? locId.slice(5) : locId;
		const gaugeId = `usgs-${siteCode}`;
		const ts = new Date(p.time).toISOString();

		records.push({
			id: compositeId([gaugeId, ts]),
			gaugeId,
			timestamp: ts,
			value: val,
			unit: p.unit_of_measure === 'ft^3/s' ? 'cfs' : p.unit_of_measure,
			qualityFlag: p.qualifier || '',
			source,
		});
	}
	return records;
}

async function fetchAllPages(url: string, source: string, maxPages = 10): Promise<GaugeReadingRecord[]> {
	const records: GaugeReadingRecord[] = [];
	let currentUrl: string | null = url;

	for (let page = 0; page < maxPages && currentUrl; page++) {
		const data: OGCResponse = await fetchWithRetry(currentUrl);
		records.push(...parseFeatures(data, source));
		const next = data.links?.find(l => l.rel === 'next');
		currentUrl = next?.href || null;
	}
	return records;
}

export async function fetchInstantaneous(siteIds: string[], periodHours = 24): Promise<GaugeReadingRecord[]> {
	const end = new Date();
	const start = new Date(end.getTime() - periodHours * 3600_000);
	const url = `${API_BASE}/continuous/items?monitoring_location_id=${siteParam(siteIds)}&parameter_code=${DISCHARGE}&datetime=${isoDate(start)}/${isoDate(end)}&f=json&limit=10000`;
	return fetchAllPages(url, 'usgs-iv');
}

export async function fetchDaily(siteIds: string[], startDate: Date, endDate: Date): Promise<GaugeReadingRecord[]> {
	const url = `${API_BASE}/daily/items?monitoring_location_id=${siteParam(siteIds)}&parameter_code=${DISCHARGE}&datetime=${isoDate(startDate)}/${isoDate(endDate)}&f=json&limit=10000`;
	return fetchAllPages(url, 'usgs-dv');
}

export async function fetchHistorical(siteIds: string[], days = 30): Promise<GaugeReadingRecord[]> {
	const end = new Date();
	const start = daysAgo(days);
	const url = `${API_BASE}/continuous/items?monitoring_location_id=${siteParam(siteIds)}&parameter_code=${DISCHARGE}&datetime=${isoDate(start)}/${isoDate(end)}&f=json&limit=10000`;
	return fetchAllPages(url, 'usgs-iv');
}

export function buildSiteUrl(siteId: string): string {
	return `https://waterdata.usgs.gov/monitoring-location/${siteId}/`;
}
