import { Resource, tables } from 'harper';
import { getFlowStatus } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

async function getLatestReadings(gaugeId: string, limit = 96): Promise<any[]> {
	const readings = await collect(
		tables.GaugeReading.search({
			conditions: [{ attribute: 'gaugeId', value: gaugeId, comparator: 'equals' }],
		})
	);
	readings.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
	return readings.slice(0, limit);
}

function computeTrend(readings: any[]): { current: number | null; change24h: number | null; change7d: number | null; trend: string } {
	if (!readings.length) return { current: null, change24h: null, change7d: null, trend: 'unknown' };

	const current = readings[0].value;
	const now = Date.now();
	const reading24h = readings.find((r: any) => new Date(r.timestamp).getTime() <= now - 24 * 3600_000);
	const reading7d = readings.find((r: any) => new Date(r.timestamp).getTime() <= now - 7 * 24 * 3600_000);

	const change24h = reading24h ? Math.round(current - reading24h.value) : null;
	const change7d = reading7d ? Math.round(current - reading7d.value) : null;

	let trend = 'steady';
	if (change24h !== null) {
		if (change24h > 50) trend = 'rising';
		else if (change24h < -50) trend = 'falling';
	}

	return { current: Math.round(current), change24h, change7d, trend };
}

const STATUS_ORDER: Record<string, number> = {
	dangerous: 0, 'expert-only': 1, high: 2, ideal: 3,
	runnable: 4, low: 5, 'too-low': 6, 'no-flow': 7, unknown: 8,
};

let cachedResult: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60_000;

export function invalidateDashboardCache() {
	cachedResult = null;
	cacheTimestamp = 0;
}

export class Dashboard extends Resource {
	allowRead() { return true; }
	async get() {
		const now = Date.now();
		if (cachedResult && (now - cacheTimestamp) < CACHE_TTL_MS) {
			return new Response(JSON.stringify(cachedResult), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
				},
			});
		}
		const rivers = await collect(tables.River.search({ conditions: [] }));
		const sections = await collect(tables.RiverSection.search({ conditions: [] }));

		const dashboard = [];
		for (const river of rivers) {
			const riverSections = sections.filter((s: any) => s.riverId === river.id);
			const sectionData = [];

			for (const section of riverSections) {
				const readings = section.primaryGaugeId ? await getLatestReadings(section.primaryGaugeId) : [];
				const flow = computeTrend(readings);
				const status = flow.current !== null
					? getFlowStatus(flow.current, {
						low: section.flowLow, runnable: section.flowRunnable,
						idealMin: section.flowIdealMin, idealMax: section.flowIdealMax,
						high: section.flowHigh, expert: section.flowExpert,
						dangerous: section.flowDangerous,
					})
					: 'unknown';

				const sparkline = readings.slice(0, 30).reverse().map((r: any) => Math.round(r.value));
				const updatedAt = readings.length ? readings[0].timestamp : null;
				let gaugeName: string | null = null;
				if (section.primaryGaugeId) {
					const gauge = await tables.Gauge.get(section.primaryGaugeId);
					if (gauge) gaugeName = (gauge as any).name || section.primaryGaugeId;
				}

				sectionData.push({
					id: section.id,
					name: section.name,
					difficulty: section.difficultyMax !== section.difficultyMin
						? `${section.difficultyMin}-${section.difficultyMax}`
						: section.difficultyMin,
					lengthMiles: section.lengthMiles,
					currentFlow: flow.current,
					unit: 'cfs',
					trend: flow.trend,
					change24h: flow.change24h,
					change7d: flow.change7d,
					status,
					primaryGaugeId: section.primaryGaugeId,
					latitude: section.latitude,
					longitude: section.longitude,
					sparkline,
					updatedAt,
					gaugeName,
				});
			}

			sectionData.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

			if (sectionData.length > 0) {
				dashboard.push({
					id: river.id,
					name: river.name,
					description: river.description,
					sections: sectionData,
				});
			}
		}

		dashboard.sort((a, b) => a.name.localeCompare(b.name));

		const result = { generated_at: new Date().toISOString(), rivers: dashboard };
		cachedResult = result;
		cacheTimestamp = Date.now();
		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	}
}
