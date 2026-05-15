import { Resource, tables } from 'harper';
import { isoNow } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

async function latestLogFor(sourceId: string): Promise<any | null> {
	const rows = await collect(tables.IngestionLog.search({
		conditions: [{ attribute: 'sourceId', value: sourceId, comparator: 'equals' }],
		sort: { attribute: 'timestamp', descending: true },
		limit: 1,
	}));
	return rows[0] || null;
}

async function latestDataFor(table: any, indexAttr: string): Promise<string | null> {
	const rows = await collect(table.search({
		conditions: [{ attribute: indexAttr, value: '', comparator: 'greater_than' }],
		sort: { attribute: indexAttr, descending: true },
		limit: 1,
	}));
	return rows[0]?.[indexAttr] || null;
}

async function rowCount(table: any): Promise<number> {
	const rows = await collect(table.search({ conditions: [] }));
	return rows.length;
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
			gaugeReadingLatest,
			gaugeReadingCount,
			snowpackLatest,
			snowpackCount,
			damReleaseLatest,
			damReleaseCount,
			weatherLatest,
			weatherCount,
		] = await Promise.all([
			latestDataFor(tables.GaugeReading, 'timestamp'),
			rowCount(tables.GaugeReading),
			latestDataFor(tables.SnowpackReading, 'timestamp'),
			rowCount(tables.SnowpackReading),
			latestDataFor(tables.DamRelease, 'timestamp'),
			rowCount(tables.DamRelease),
			latestDataFor(tables.WeatherForecast, 'capturedAt'),
			rowCount(tables.WeatherForecast),
		]);

		const dataByTable = {
			GaugeReading: { latestAt: gaugeReadingLatest, ageMin: ageMinutes(gaugeReadingLatest), totalRows: gaugeReadingCount },
			SnowpackReading: { latestAt: snowpackLatest, ageMin: ageMinutes(snowpackLatest), totalRows: snowpackCount },
			DamRelease: { latestAt: damReleaseLatest, ageMin: ageMinutes(damReleaseLatest), totalRows: damReleaseCount },
			WeatherForecast: { latestAt: weatherLatest, ageMin: ageMinutes(weatherLatest), totalRows: weatherCount },
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

		const sourceReports = await Promise.all(sources.map(async (s: any) => {
			const log = await latestLogFor(s.id);
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
		}));

		return {
			generatedAt: isoNow(),
			sources: sourceReports,
			tables: dataByTable,
		};
	}
}
