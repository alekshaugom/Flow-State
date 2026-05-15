import { tables } from 'harper';
import { compositeId, isoNow } from '../utils.ts';
import { fetchDaily } from '../adapters/usgs.ts';
import { fetchBasinSnowData, COLORADO_BASINS } from '../adapters/snotel.ts';
import { fetchReservoirData, BOR_CATALOG } from '../adapters/bor.ts';
import { fetchArchiveDaily } from '../adapters/open-meteo-archive.ts';

export type BackfillSource = 'usgs' | 'snotel' | 'bor' | 'weather-obs';

export interface BackfillResult {
	days: number;
	startDate: string;
	endDate: string;
	sources: BackfillSource[];
	usgs?: SourceResult;
	snotel?: SourceResult;
	bor?: SourceResult;
	weatherObs?: SourceResult;
}

interface SourceResult {
	stationsAttempted: number;
	rowsWritten: number;
	errors: string[];
	durationMs: number;
}

const PER_REQUEST_DELAY_MS = 2000;

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

async function logIngestion(sourceId: string, status: string, recordsProcessed: number, errors: string, durationMs: number) {
	const ts = isoNow();
	await tables.IngestionLog.put(compositeId([sourceId, ts]), {
		id: compositeId([sourceId, ts]),
		sourceId,
		timestamp: ts,
		status,
		recordsProcessed,
		errors: errors || null,
		durationMs,
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

export async function runBackfill(
	days: number,
	sources: BackfillSource[] = ['usgs', 'snotel', 'bor', 'weather-obs'],
): Promise<BackfillResult> {
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - days * 24 * 3600_000);

	const result: BackfillResult = {
		days,
		startDate: startDate.toISOString().split('T')[0],
		endDate: endDate.toISOString().split('T')[0],
		sources,
	};

	if (sources.includes('usgs'))        result.usgs       = await backfillUsgs(startDate, endDate);
	if (sources.includes('snotel'))      result.snotel     = await backfillSnotel(startDate, endDate);
	if (sources.includes('bor'))         result.bor        = await backfillBor(startDate, endDate);
	if (sources.includes('weather-obs')) result.weatherObs = await backfillWeatherObs(startDate, endDate);

	return result;
}

async function backfillUsgs(startDate: Date, endDate: Date): Promise<SourceResult> {
	const start = Date.now();
	const gauges = await collect(tables.Gauge.search({ conditions: [{ attribute: 'active', value: true, comparator: 'equals' }] }));
	const usgsGauges = gauges.filter((g: any) => g.source === 'usgs');

	let rowsWritten = 0;
	const errors: string[] = [];

	for (const gauge of usgsGauges) {
		try {
			const readings = await fetchDaily([(gauge as any).sourceId], startDate, endDate);
			for (const r of readings) await tables.GaugeReading.put(r.id, r);
			rowsWritten += readings.length;
			console.log(`[backfill:usgs] ${(gauge as any).sourceId}: ${readings.length} daily readings`);
		} catch (err) {
			errors.push(`${(gauge as any).sourceId}: ${(err as Error).message}`);
		}
		await sleep(PER_REQUEST_DELAY_MS);
	}

	const durationMs = Date.now() - start;
	await logIngestion('backfill-usgs', errors.length ? 'partial' : 'success', rowsWritten, errors.join('; '), durationMs);
	return { stationsAttempted: usgsGauges.length, rowsWritten, errors, durationMs };
}

async function backfillSnotel(startDate: Date, endDate: Date): Promise<SourceResult> {
	const start = Date.now();
	let rowsWritten = 0;
	const errors: string[] = [];
	const basinKeys = Object.keys(COLORADO_BASINS);

	for (const key of basinKeys) {
		const basin = COLORADO_BASINS[key];
		try {
			const readings = await fetchBasinSnowData(key, basin.triplets, startDate, endDate);
			for (const r of readings) await tables.SnowpackReading.put(r.id, r);
			rowsWritten += readings.length;
			console.log(`[backfill:snotel] ${key}: ${readings.length} readings across ${basin.triplets.length} stations`);
		} catch (err) {
			errors.push(`${key}: ${(err as Error).message}`);
		}
		await sleep(PER_REQUEST_DELAY_MS);
	}

	const durationMs = Date.now() - start;
	await logIngestion('backfill-snotel', errors.length ? 'partial' : 'success', rowsWritten, errors.join('; '), durationMs);
	return { stationsAttempted: basinKeys.length, rowsWritten, errors, durationMs };
}

async function backfillBor(startDate: Date, endDate: Date): Promise<SourceResult> {
	const start = Date.now();
	let rowsWritten = 0;
	const errors: string[] = [];
	const keys = Object.keys(BOR_CATALOG);

	for (const key of keys) {
		try {
			const records = await fetchReservoirData(key, startDate, endDate);
			for (const r of records) await tables.DamRelease.put(r.id, r);
			rowsWritten += records.length;
			console.log(`[backfill:bor] ${key}: ${records.length} daily records`);
		} catch (err) {
			errors.push(`${key}: ${(err as Error).message}`);
		}
		await sleep(PER_REQUEST_DELAY_MS);
	}

	const durationMs = Date.now() - start;
	await logIngestion('backfill-bor', errors.length ? 'partial' : 'success', rowsWritten, errors.join('; '), durationMs);
	return { stationsAttempted: keys.length, rowsWritten, errors, durationMs };
}

async function backfillWeatherObs(startDate: Date, endDate: Date): Promise<SourceResult> {
	const start = Date.now();
	let rowsWritten = 0;
	const errors: string[] = [];

	const allSections = await collect(tables.RiverSection.search({ conditions: [] }));
	const sections = allSections.filter((s: any) => typeof s.latitude === 'number' && typeof s.longitude === 'number');

	for (const section of sections) {
		try {
			const obs = await fetchArchiveDaily(
				(section as any).latitude,
				(section as any).longitude,
				startDate,
				endDate,
			);
			const capturedAt = isoNow();
			for (const o of obs) {
				const id = compositeId([section.id, o.date]);
				await tables.WeatherObservation.put(id, {
					id,
					sectionId: section.id,
					date: o.date,
					tempHighF: o.tempHighF,
					tempLowF: o.tempLowF,
					precipIn: o.precipIn,
					precipSnowIn: o.precipSnowIn,
					windMph: o.windMph,
					weatherCode: o.weatherCode,
					source: 'open-meteo-archive',
					capturedAt,
				});
				rowsWritten++;
			}
			console.log(`[backfill:weather-obs] ${section.id}: ${obs.length} daily observations`);
		} catch (err) {
			errors.push(`${section.id}: ${(err as Error).message}`);
		}
		await sleep(PER_REQUEST_DELAY_MS);
	}

	const durationMs = Date.now() - start;
	await logIngestion('backfill-weather-obs', errors.length ? 'partial' : 'success', rowsWritten, errors.join('; '), durationMs);
	return { stationsAttempted: sections.length, rowsWritten, errors, durationMs };
}
