import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { fetchInstantaneous } from '../lib/adapters/usgs.ts';
import { fetchTelemetryTimeSeries } from '../lib/adapters/cdss.ts';
import { fetchBasinSnowData, COLORADO_BASINS } from '../lib/adapters/snotel.ts';
import { fetchReservoirData, BOR_CATALOG } from '../lib/adapters/bor.ts';
import { runWeatherIngestion } from '../lib/agents/weather-agent.ts';
import { runBackfill, type BackfillSource } from '../lib/jobs/backfill.ts';
import { invalidateDashboardCache } from './Dashboard.ts';

const POLL_MS = 60_000;
const GAUGE_INTERVAL_MS = 15 * 60_000;
const SNOW_INTERVAL_MS = 6 * 3600_000;
const RESERVOIR_INTERVAL_MS = 6 * 3600_000;
const WEATHER_INTERVAL_MS = 6 * 3600_000;
const WORKER_FLAG = '__flowStateIngestionStarted';

let lastGaugeFetch = 0;
let lastSnowFetch = 0;
let lastReservoirFetch = 0;
let lastWeatherFetch = 0;

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

async function updateGaugeSnapshots(): Promise<void> {
	const gauges = await collect(
		tables.Gauge.search({ conditions: [{ attribute: 'active', value: true, comparator: 'equals' }] })
	);

	const cutoff30d = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

	for (const gauge of gauges) {
		try {
			const readings = await collect(
				tables.GaugeReading.search({
					conditions: [
						{ attribute: 'gaugeId', value: gauge.id, comparator: 'equals' },
						{ attribute: 'timestamp', value: cutoff30d, comparator: 'gte' },
					],
					sort: { attribute: 'timestamp', descending: true },
				})
			);

			if (!readings.length) continue;

			const current = readings[0].value;
			const now = Date.now();
			const reading24h = readings.find((r: any) =>
				new Date(r.timestamp).getTime() <= now - 24 * 3600_000
			);
			const reading7d = readings.find((r: any) =>
				new Date(r.timestamp).getTime() <= now - 7 * 24 * 3600_000
			);

			const change24h = reading24h ? Math.round(current - reading24h.value) : null;
			const change7d = reading7d ? Math.round(current - reading7d.value) : null;

			let trend = 'steady';
			if (change24h !== null) {
				if (change24h > 50) trend = 'rising';
				else if (change24h < -50) trend = 'falling';
			}

			const daily = new Map<string, number>();
			for (const r of readings) {
				const day = (r as any).timestamp.slice(0, 10);
				if (!daily.has(day)) daily.set(day, Math.round((r as any).value));
			}
			const sparkline = [...daily.values()].reverse();

			await tables.GaugeSnapshot.put(gauge.id, {
				id: gauge.id,
				gaugeName: gauge.name || gauge.id,
				currentFlow: Math.round(current),
				trend,
				change24h,
				change7d,
				sparkline: JSON.stringify(sparkline),
				unit: gauge.unit || 'cfs',
				updatedAt: readings[0].timestamp,
			});
		} catch (err) {
			console.warn(`[ingestion] snapshot failed for ${gauge.id}:`, (err as Error).message);
		}
	}
	console.log(`[ingestion] snapshots updated for ${gauges.length} gauges`);
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
	await updateGaugeSnapshots();
	invalidateDashboardCache();
}

async function ingestSnowpack(): Promise<void> {
	const start = Date.now();
	let totalRecords = 0;
	const errors: string[] = [];

	for (const [key, basin] of Object.entries(COLORADO_BASINS)) {
		try {
			const readings = await fetchBasinSnowData(key, basin.triplets);
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

async function ingestWeather(): Promise<void> {
	const start = Date.now();
	try {
		const { sectionsAttempted, rowsWritten, errors } = await runWeatherIngestion();
		await logIngestion(
			'open-meteo',
			errors.length === 0 ? 'success' : (rowsWritten > 0 ? 'partial' : 'error'),
			rowsWritten,
			errors.join('; '),
			Date.now() - start,
		);
		console.log(`[ingestion] weather: ${rowsWritten} forecast rows across ${sectionsAttempted} sections`);
	} catch (err) {
		await logIngestion('open-meteo', 'error', 0, (err as Error).message, Date.now() - start);
	}
}

const VALID_BACKFILL_SOURCES: BackfillSource[] = ['usgs', 'snotel', 'bor', 'weather-obs'];

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
		if (now - lastWeatherFetch >= WEATHER_INTERVAL_MS) {
			lastWeatherFetch = now;
			await ingestWeather();
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
	updateGaugeSnapshots().catch(err =>
		console.warn('[ingestion] initial snapshot seeding failed:', (err as Error).message)
	);
	g.__flowStateIngestionInterval = setInterval(tick, POLL_MS);
}

startWorker();

export class Ingestion extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; } // TODO: remove after backfill
	async get() {
		return {
			worker_started: !!(globalThis as any)[WORKER_FLAG],
			poll_interval_ms: POLL_MS,
			gauge_interval_ms: GAUGE_INTERVAL_MS,
			snow_interval_ms: SNOW_INTERVAL_MS,
			reservoir_interval_ms: RESERVOIR_INTERVAL_MS,
			weather_interval_ms: WEATHER_INTERVAL_MS,
			last_gauge_fetch: lastGaugeFetch ? new Date(lastGaugeFetch).toISOString() : null,
			last_snow_fetch: lastSnowFetch ? new Date(lastSnowFetch).toISOString() : null,
			last_reservoir_fetch: lastReservoirFetch ? new Date(lastReservoirFetch).toISOString() : null,
			last_weather_fetch: lastWeatherFetch ? new Date(lastWeatherFetch).toISOString() : null,
			now: isoNow(),
		};
	}

	async post(data: any) {
		if (data?.action === 'run') {
			const source = data.source;
			if (source === 'usgs' || source === 'cdss' || !source) await ingestGauges();
			if (source === 'snotel' || !source) await ingestSnowpack();
			if (source === 'bor' || !source) await ingestReservoirs();
			if (source === 'noaa' || source === 'weather' || !source) await ingestWeather();
			return { ok: true, action: 'run', source: source || 'all' };
		}
		if (data?.action === 'rebuild-snapshots') {
			await updateGaugeSnapshots();
			invalidateDashboardCache();
			return { ok: true, action: 'rebuild-snapshots' };
		}
		if (data?.action === 'backfill') {
			const days = data.days || 30;
			const requested: string[] = Array.isArray(data.sources) ? data.sources : VALID_BACKFILL_SOURCES;
			const sources = requested.filter((s): s is BackfillSource => VALID_BACKFILL_SOURCES.includes(s as BackfillSource));
			if (sources.length === 0) {
				return new Response(`invalid sources — supported: ${VALID_BACKFILL_SOURCES.join(', ')}`, { status: 400 });
			}
			const result = await runBackfill(days, sources);
			invalidateDashboardCache();
			return { ok: true, action: 'backfill', ...result };
		}
		if (data?.action === 'cleanup-bor-stale-rows') {
			// One-shot: deletes any DamRelease rows whose reservoirId is no longer in BOR_CATALOG.
			// Used after fixing the BOR catalog to wipe rows written under wrong reservoir keys
			// when itemIds were mapped to the wrong reservoir.
			const validKeys = new Set(Object.keys(BOR_CATALOG));
			const all = await collect(tables.DamRelease.search({ conditions: [] }));
			let deleted = 0;
			for (const row of all) {
				if (!validKeys.has((row as any).reservoirId)) {
					await tables.DamRelease.delete((row as any).id);
					deleted++;
				}
			}
			return { ok: true, action: 'cleanup-bor-stale-rows', deleted, kept: all.length - deleted };
		}
		return new Response('unknown action — supported: "run", "backfill", "cleanup-bor-stale-rows"', { status: 400 });
	}
}
