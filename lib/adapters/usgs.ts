import { fetchWithRetry, compositeId, isoDate, daysAgo } from '../utils.ts';

const USGS_BASE = 'https://waterservices.usgs.gov/nwis/iv';
const USGS_DAILY_BASE = 'https://waterservices.usgs.gov/nwis/dv';

// USGS parameter codes
const DISCHARGE_CFS = '00060';
const GAGE_HEIGHT_FT = '00065';

interface USGSTimeSeries {
	sourceInfo: { siteCode: Array<{ value: string }>; siteName: string };
	variable: { variableCode: Array<{ value: string }>; unit: { unitCode: string } };
	values: Array<{ value: Array<{ value: string; dateTime: string; qualifiers: string[] }> }>;
}

interface USGSResponse {
	value: { timeSeries: USGSTimeSeries[] };
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

export async function fetchInstantaneous(siteIds: string[], periodHours = 24): Promise<GaugeReadingRecord[]> {
	const sites = siteIds.join(',');
	const url = `${USGS_BASE}/?format=json&sites=${sites}&parameterCd=${DISCHARGE_CFS}&period=PT${periodHours}H`;
	const data: USGSResponse = await fetchWithRetry(url);
	return parseTimeSeries(data, 'usgs-iv');
}

export async function fetchDaily(siteIds: string[], startDate: Date, endDate: Date): Promise<GaugeReadingRecord[]> {
	const sites = siteIds.join(',');
	const url = `${USGS_DAILY_BASE}/?format=json&sites=${sites}&parameterCd=${DISCHARGE_CFS}&startDT=${isoDate(startDate)}&endDT=${isoDate(endDate)}`;
	const data: USGSResponse = await fetchWithRetry(url);
	return parseTimeSeries(data, 'usgs-dv');
}

export async function fetchHistorical(siteIds: string[], days = 30): Promise<GaugeReadingRecord[]> {
	return fetchDaily(siteIds, daysAgo(days), new Date());
}

function parseTimeSeries(data: USGSResponse, source: string): GaugeReadingRecord[] {
	const records: GaugeReadingRecord[] = [];
	if (!data?.value?.timeSeries) return records;

	for (const series of data.value.timeSeries) {
		const siteCode = series.sourceInfo?.siteCode?.[0]?.value;
		const paramCode = series.variable?.variableCode?.[0]?.value;
		if (!siteCode || paramCode !== DISCHARGE_CFS) continue;

		const unit = series.variable?.unit?.unitCode || 'cfs';
		const gaugeId = `usgs-${siteCode}`;

		for (const valSet of series.values) {
			for (const point of valSet.value) {
				const val = parseFloat(point.value);
				if (isNaN(val) || val < 0) continue;

				const ts = new Date(point.dateTime).toISOString();
				records.push({
					id: compositeId([gaugeId, ts]),
					gaugeId,
					timestamp: ts,
					value: val,
					unit,
					qualityFlag: point.qualifiers?.join(',') || '',
					source,
				});
			}
		}
	}
	return records;
}

export function buildSiteUrl(siteId: string): string {
	return `https://waterdata.usgs.gov/nwis/uv?site_no=${siteId}`;
}
