import { Resource, tables } from 'harper';
import { getFlowStatus } from '../lib/utils.ts';
import { resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
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

		const [rivers, sections, snapshots, allBands] = await Promise.all([
			collect(tables.River.search({ conditions: [] })),
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.GaugeSnapshot.search({ conditions: [] })),
			collect(tables.FlowBand.search({ conditions: [] })),
		]);

		const snapshotMap = new Map<string, any>();
		for (const s of snapshots) snapshotMap.set(s.id, s);

		const bandsBySection = new Map<string, any[]>();
		for (const b of allBands) {
			const arr = bandsBySection.get(b.sectionId) || [];
			arr.push(b);
			bandsBySection.set(b.sectionId, arr);
		}

		const dashboard = [];
		for (const river of rivers) {
			const riverSections = sections.filter((s: any) => s.riverId === river.id);
			const sectionData = [];

			for (const section of riverSections) {
				const snap = section.primaryGaugeId
					? snapshotMap.get(section.primaryGaugeId)
					: null;

				const currentFlow = snap?.currentFlow ?? null;
				const roundedFlow = currentFlow !== null ? Math.round(currentFlow) : null;

				const sectionBands = bandsBySection.get(section.id) || [];
				const resolvedBand = resolveFromCache(sectionBands, section, 'raft', 'intermediate', roundedFlow);

				const status = resolvedBand
					? bandToDesignStatus(resolvedBand.bandName)
					: (currentFlow !== null
						? getFlowStatus(currentFlow, {
							low: section.flowLow, runnable: section.flowRunnable,
							idealMin: section.flowIdealMin, idealMax: section.flowIdealMax,
							high: section.flowHigh, expert: section.flowExpert,
							dangerous: section.flowDangerous,
						})
						: 'unknown');

				const statusLabel = resolvedBand ? bandToLabel(resolvedBand.bandName) : null;

				let sparkline: number[] = [];
				try {
					if (snap?.sparkline) sparkline = JSON.parse(snap.sparkline);
				} catch {}

				sectionData.push({
					id: section.id,
					name: section.name,
					difficulty: section.difficultyMax !== section.difficultyMin
						? `${section.difficultyMin}-${section.difficultyMax}`
						: section.difficultyMin,
					lengthMiles: section.lengthMiles,
					currentFlow,
					unit: snap?.unit || 'cfs',
					trend: snap?.trend || 'unknown',
					change24h: snap?.change24h ?? null,
					change7d: snap?.change7d ?? null,
					status,
					statusLabel,
					primaryGaugeId: section.primaryGaugeId,
					latitude: section.latitude,
					longitude: section.longitude,
					sparkline,
					updatedAt: snap?.updatedAt || null,
					gaugeName: snap?.gaugeName || null,
					flowBands: sectionBands,
					thresholds: {
						flowLow: section.flowLow,
						flowRunnable: section.flowRunnable,
						flowIdealMin: section.flowIdealMin,
						flowIdealMax: section.flowIdealMax,
						flowHigh: section.flowHigh,
						flowExpert: section.flowExpert,
						flowDangerous: section.flowDangerous,
					},
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
