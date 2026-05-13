import { fetchWithRetry, compositeId, isoDate, daysAgo, tomorrow } from '../utils.ts';

const CDSS_BASE = 'https://dwr.state.co.us/Rest/GET/api/v2';

interface CDSSTimeSeriesRecord {
	abbrev: string;
	stationName: string;
	measDateTime: string;
	measDate: string;
	value: number;
	measUnit: string;
	flagA: string;
	flagB: string;
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

export async function fetchTelemetryStations(waterDistrict?: string): Promise<any[]> {
	let url = `${CDSS_BASE}/telemetrystations/telemetrystation/?format=json&includeThirdParty=true`;
	if (waterDistrict) url += `&waterDistrict=${waterDistrict}`;
	const data = await fetchWithRetry(url);
	return data?.ResultList || [];
}

export async function fetchTelemetryTimeSeries(
	abbrev: string,
	parameter = 'DISCHRG',
	startDate?: Date,
	endDate?: Date
): Promise<GaugeReadingRecord[]> {
	const start = isoDate(startDate || daysAgo(7));
	const end = isoDate(endDate || tomorrow());
	const url = `${CDSS_BASE}/telemetrystations/telemetrytimeseriesraw/?format=json&abbrev=${abbrev}&parameter=${parameter}&startDate=${start}&endDate=${end}`;
	const data = await fetchWithRetry(url);
	return parseTelemetry(data?.ResultList || [], abbrev);
}

export async function fetchSurfaceWaterStations(waterDistrict?: string): Promise<any[]> {
	let url = `${CDSS_BASE}/surfacewater/surfacewaterstations/?format=json`;
	if (waterDistrict) url += `&waterDistrict=${waterDistrict}`;
	const data = await fetchWithRetry(url);
	return data?.ResultList || [];
}

export async function fetchSurfaceWaterTimeSeries(
	abbrev: string,
	startYear?: number,
	endYear?: number
): Promise<GaugeReadingRecord[]> {
	const sy = startYear || new Date().getFullYear() - 1;
	const ey = endYear || new Date().getFullYear();
	const url = `${CDSS_BASE}/surfacewater/surfacewatertsday/?format=json&abbrev=${abbrev}&min-calYear=${sy}&max-calYear=${ey}`;
	const data = await fetchWithRetry(url);
	return parseSurfaceWater(data?.ResultList || [], abbrev);
}

export async function fetchReservoirData(stationNum: string): Promise<any[]> {
	const url = `${CDSS_BASE}/surfacewater/surfacewatertsday/?format=json&abbrev=${stationNum}&min-calYear=${new Date().getFullYear()}`;
	const data = await fetchWithRetry(url);
	return data?.ResultList || [];
}

export async function fetchDiversionRecords(wdid: string): Promise<any[]> {
	const year = new Date().getFullYear();
	const url = `${CDSS_BASE}/structures/divrec/divrecday/?format=json&wdid=${wdid}&min-dataMeasDate=${year}-01-01`;
	const data = await fetchWithRetry(url);
	return data?.ResultList || [];
}

function parseTelemetry(records: CDSSTimeSeriesRecord[], abbrev: string): GaugeReadingRecord[] {
	const results: GaugeReadingRecord[] = [];
	for (const r of records) {
		if (r.value == null || r.value < 0) continue;
		const ts = new Date(r.measDateTime || r.measDate).toISOString();
		const gaugeId = `cdss-${abbrev}`;
		results.push({
			id: compositeId([gaugeId, ts]),
			gaugeId,
			timestamp: ts,
			value: r.value,
			unit: r.measUnit || 'cfs',
			qualityFlag: [r.flagA, r.flagB].filter(Boolean).join(','),
			source: 'cdss-telemetry',
		});
	}
	return results;
}

function parseSurfaceWater(records: any[], abbrev: string): GaugeReadingRecord[] {
	const results: GaugeReadingRecord[] = [];
	for (const r of records) {
		const val = r.value ?? r.measValue;
		if (val == null || val < 0) continue;
		const ts = new Date(r.measDate).toISOString();
		const gaugeId = `cdss-${abbrev}`;
		results.push({
			id: compositeId([gaugeId, ts]),
			gaugeId,
			timestamp: ts,
			value: val,
			unit: r.measUnit || 'cfs',
			qualityFlag: '',
			source: 'cdss-surface',
		});
	}
	return results;
}

export function buildStationUrl(abbrev: string): string {
	return `https://dwr.state.co.us/tools/stations/${abbrev}`;
}
