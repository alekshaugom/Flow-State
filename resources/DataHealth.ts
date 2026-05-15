import { Resource, tables } from 'harper';
import { isoNow } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

// L004 workaround: filtered searches lag immediately after Fabric rolling restarts.
// Empty-conditions scans see all rows, so we full-scan once + reduce in-memory.

async function latestLogForAll(): Promise<Map<string, any>> {
	const map = new Map<string, any>();
	for await (const log of tables.IngestionLog.search({ conditions: [] })) {
		const prev = map.get((log as any).sourceId);
		if (!prev || ((log as any).timestamp || '') > (prev.timestamp || '')) {
			map.set((log as any).sourceId, log);
		}
	}
	return map;
}

async function latestDataFor(table: any, indexAttr: string): Promise<{ latest: string | null; totalRows: number }> {
	let latest: string | null = null;
	let total = 0;
	for await (const row of table.search({ conditions: [] })) {
		total++;
		const v = (row as any)[indexAttr];
		if (typeof v === 'string' && (latest == null || v > latest)) latest = v;
	}
	return { latest, totalRows: total };
}

function ageMinutes(iso: string | null | undefined): number | null {
	if (!iso) return null;
	return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

export class DataHealth extends Resource {
	allowRead() { return true; }

	async get() {
		const allSources = await collect(tables.DataSource.search({ conditions: [] }));
		const sources = allSources.filter((s: any) => typeof s.id === 'string' && s.id.length > 0);

		const [
			gaugeRead,
			snowRead,
			damRead,
			weatherRead,
			logsBySource,
		] = await Promise.all([
			latestDataFor(tables.GaugeReading, 'timestamp'),
			latestDataFor(tables.SnowpackReading, 'timestamp'),
			latestDataFor(tables.DamRelease, 'timestamp'),
			latestDataFor(tables.WeatherForecast, 'capturedAt'),
			latestLogForAll(),
		]);

		const dataByTable = {
			GaugeReading: { latestAt: gaugeRead.latest, ageMin: ageMinutes(gaugeRead.latest), totalRows: gaugeRead.totalRows },
			SnowpackReading: { latestAt: snowRead.latest, ageMin: ageMinutes(snowRead.latest), totalRows: snowRead.totalRows },
			DamRelease: { latestAt: damRead.latest, ageMin: ageMinutes(damRead.latest), totalRows: damRead.totalRows },
			WeatherForecast: { latestAt: weatherRead.latest, ageMin: ageMinutes(weatherRead.latest), totalRows: weatherRead.totalRows },
		};

		const sourceToTable: Record<string, keyof typeof dataByTable> = {
			usgs: 'GaugeReading',
			cdss: 'GaugeReading',
			snotel: 'SnowpackReading',
			bor: 'DamRelease',
			'open-meteo': 'WeatherForecast',
			'noaa-nws': 'WeatherForecast',
			noaa: 'WeatherForecast',
		};

		const sourceReports = sources.map((s: any) => {
			const log = logsBySource.get(s.id) || null;
			const tableKey = sourceToTable[s.id];
			return {
				id: s.id,
				name: s.name,
				type: s.type,
				active: s.active,
				lastFetchAt: s.lastFetchAt,
				lastFetchAgeMin: ageMinutes(s.lastFetchAt),
				lastError: s.lastError || null,
				lastLog: log ? {
					timestamp: log.timestamp,
					status: log.status,
					recordsProcessed: log.recordsProcessed,
					durationMs: log.durationMs,
					errors: log.errors || null,
				} : null,
				data: tableKey ? dataByTable[tableKey] : null,
			};
		});

		return {
			generatedAt: isoNow(),
			sources: sourceReports,
			tables: dataByTable,
		};
	}
}
