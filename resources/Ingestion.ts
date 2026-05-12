import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { fetchInstantaneous, fetchHistorical } from '../lib/adapters/usgs.ts';
import { fetchTelemetryTimeSeries } from '../lib/adapters/cdss.ts';
import { fetchBasinSnowData, COLORADO_BASINS } from '../lib/adapters/snotel.ts';
import { fetchReservoirData, BOR_CATALOG } from '../lib/adapters/bor.ts';
import { invalidateDashboardCache } from './Dashboard.ts';

const POLL_MS = 60_000;
const GAUGE_INTERVAL_MS = 15 * 60_000;
const SNOW_INTERVAL_MS = 6 * 3600_000;
const RESERVOIR_INTERVAL_MS = 6 * 3600_000;
const WORKER_FLAG = '__flowStateIngestionStarted';

let lastGaugeFetch = 0;
let lastSnowFetch = 0;
let lastReservoirFetch = 0;

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
	await tables.DataSource.patch(sourceId, {
		lastFetchAt: ts,
		lastError: status === 'error' ? errors : null,
	});
}

async function ingestGauges(): Promise<void> {
	const start = Date.now();
	const gauges = await collect(tables.Gauge.search({ conditions: [{ attribute: 'active', value: true, comparator: 'equals' }] }));
	const usgsIds: string[] = [];
	const cdssAbbrevs: string[] = [];

	for (const g of gauges) {
		if (g.source === 'usgs') usgsIds.push(g.sourceId);
		else if (g.source === 'cdss') cdssAbbrevs.push(g.sourceId);
	}

	let totalRecords = 0;
	const errors: string[] = [];

	// USGS: batch in groups of 20
	for (let i = 0; i < usgsIds.length; i += 20) {
		const batch = usgsIds.slice(i, i + 20);
		try {
			const readings = await fetchInstantaneous(batch);
			for (const r of readings) await tables.GaugeReading.put(r.id, r);
			totalRecords += readings.length;
		} catch (err) {
			errors.push(`USGS batch ${i}: ${(err as Error).message}`);
		}
	}
	await logIngestion('usgs', errors.length ? 'partial' : 'success', totalRecords, errors.join('; '), Date.now() - start);

	// CDSS
	const cdssStart = Date.now();
	let cdssRecords = 0;
	const cdssErrors: string[] = [];
	for (const abbrev of cdssAbbrevs) {
		try {
			const readings = await fetchTelemetryTimeSeries(abbrev);
			for (const r of readings) await tables.GaugeReading.put(r.id, r);
			cdssRecords += readings.length;
		} catch (err) {
			cdssErrors.push(`${abbrev}: ${(err as Error).message}`);
		}
	}
	if (cdssAbbrevs.length > 0) {
		await logIngestion('cdss', cdssErrors.length ? 'partial' : 'success', cdssRecords, cdssErrors.join('; '), Date.now() - cdssStart);
	}

	console.log(`[ingestion] gauges: ${totalRecords + cdssRecords} readings stored`);
	invalidateDashboardCache();
}

async function ingestSnowpack(): Promise<void> {
	const start = Date.now();
	let totalRecords = 0;
	const errors: string[] = [];

	for (const [key, basin] of Object.entries(COLORADO_BASINS)) {
		try {
			const readings = await fetchBasinSnowData(basin.triplets);
			for (const r of readings) await tables.SnowpackReading.put(r.id, r);
			totalRecords += readings.length;
		} catch (err) {
			errors.push(`${key}: ${(err as Error).message}`);
		}
	}

	await logIngestion('snotel', errors.length ? 'partial' : 'success', totalRecords, errors.join('; '), Date.now() - start);
	console.log(`[ingestion] snowpack: ${totalRecords} readings stored`);
	invalidateDashboardCache();
}

async function ingestReservoirs(): Promise<void> {
	const start = Date.now();
	let totalRecords = 0;
	const errors: string[] = [];

	for (const key of Object.keys(BOR_CATALOG)) {
		try {
			const releases = await fetchReservoirData(key);
			for (const r of releases) await tables.DamRelease.put(r.id, r);
			totalRecords += releases.length;
		} catch (err) {
			errors.push(`${key}: ${(err as Error).message}`);
		}
	}

	await logIngestion('bor', errors.length ? 'partial' : 'success', totalRecords, errors.join('; '), Date.now() - start);
	console.log(`[ingestion] reservoirs: ${totalRecords} records stored`);
	invalidateDashboardCache();
}

async function backfill(days: number): Promise<{ gaugeReadings: number }> {
	const gauges = await collect(tables.Gauge.search({ conditions: [{ attribute: 'active', value: true, comparator: 'equals' }] }));
	const usgsIds = gauges.filter(g => g.source === 'usgs').map(g => g.sourceId);

	let total = 0;
	for (let i = 0; i < usgsIds.length; i += 20) {
		const batch = usgsIds.slice(i, i + 20);
		try {
			const readings = await fetchHistorical(batch, days);
			for (const r of readings) await tables.GaugeReading.put(r.id, r);
			total += readings.length;
		} catch (err) {
			console.warn(`[ingestion] backfill batch ${i} failed:`, (err as Error).message);
		}
	}
	console.log(`[ingestion] backfill: ${total} historical readings stored for ${days} days`);
	return { gaugeReadings: total };
}

async function tick(): Promise<void> {
	const now = Date.now();
	try {
		if (now - lastGaugeFetch >= GAUGE_INTERVAL_MS) {
			lastGaugeFetch = now;
			await ingestGauges();
		}
		if (now - lastSnowFetch >= SNOW_INTERVAL_MS) {
			lastSnowFetch = now;
			await ingestSnowpack();
		}
		if (now - lastReservoirFetch >= RESERVOIR_INTERVAL_MS) {
			lastReservoirFetch = now;
			await ingestReservoirs();
		}
	} catch (err) {
		console.warn('[ingestion] tick error:', (err as Error).message);
	}
}

function startWorker() {
	const g = globalThis as any;
	if (g[WORKER_FLAG]) return;
	g[WORKER_FLAG] = true;
	console.log(`[ingestion] started, checking every ${POLL_MS / 1000}s`);
	g.__flowStateIngestionInterval = setInterval(tick, POLL_MS);
}

startWorker();

export class Ingestion extends Resource {
	async get() {
		return {
			worker_started: !!(globalThis as any)[WORKER_FLAG],
			poll_interval_ms: POLL_MS,
			gauge_interval_ms: GAUGE_INTERVAL_MS,
			snow_interval_ms: SNOW_INTERVAL_MS,
			reservoir_interval_ms: RESERVOIR_INTERVAL_MS,
			last_gauge_fetch: lastGaugeFetch ? new Date(lastGaugeFetch).toISOString() : null,
			last_snow_fetch: lastSnowFetch ? new Date(lastSnowFetch).toISOString() : null,
			last_reservoir_fetch: lastReservoirFetch ? new Date(lastReservoirFetch).toISOString() : null,
			now: isoNow(),
		};
	}

	async post(data: any) {
		if (data?.action === 'run') {
			const source = data.source;
			if (source === 'usgs' || source === 'cdss' || !source) await ingestGauges();
			if (source === 'snotel' || !source) await ingestSnowpack();
			if (source === 'bor' || !source) await ingestReservoirs();
			return { ok: true, action: 'run', source: source || 'all' };
		}
		if (data?.action === 'backfill') {
			const days = data.days || 30;
			const result = await backfill(days);
			return { ok: true, action: 'backfill', days, ...result };
		}
		return new Response('unknown action — supported: "run", "backfill"', { status: 400 });
	}
}
