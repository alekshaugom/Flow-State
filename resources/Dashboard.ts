import { Resource, tables } from 'harper';
import { getFlowStatus } from '../lib/utils.ts';
import { resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';
import { listWatersheds } from '../lib/watersheds.ts';
import { listCorridors } from '../lib/corridors.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

let cachedResult: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60_000;

export function invalidateDashboardCache() {
	cachedResult = null;
	cacheTimestamp = 0;
}

async function getMyLogCounts(userId: string | null): Promise<Map<string, { count: number; lastLoggedAt: string | null }>> {
	const out = new Map<string, { count: number; lastLoggedAt: string | null }>();
	if (!userId) return out;
	for await (const log of tables.RiverLog.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	})) {
		const sid = (log as any).sectionId;
		if (!sid) continue;
		const existing = out.get(sid) || { count: 0, lastLoggedAt: null };
		existing.count += 1;
		const d = (log as any).date as string | null;
		if (d && (existing.lastLoggedAt == null || d > existing.lastLoggedAt)) existing.lastLoggedAt = d;
		out.set(sid, existing);
	}
	return out;
}

export class Dashboard extends Resource {
	allowRead() { return true; }
	async get() {
		const userId = (this.getContext() as any)?.session?.user || null;

		const now = Date.now();
		// Public dashboard is cacheable; auth-scoped log counts are not.
		const usePublicCache = !userId && cachedResult && (now - cacheTimestamp) < CACHE_TTL_MS;
		if (usePublicCache) {
			return new Response(JSON.stringify(cachedResult), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
				},
			});
		}

		const [rivers, sections, snapshots, allBands, watersheds, corridors, myLogCounts] = await Promise.all([
			collect(tables.River.search({ conditions: [] })),
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.GaugeSnapshot.search({ conditions: [] })),
			collect(tables.FlowBand.search({ conditions: [] })),
			listWatersheds(),
			listCorridors(),
			getMyLogCounts(userId),
		]);

		const snapshotMap = new Map<string, any>();
		for (const s of snapshots) snapshotMap.set(s.id, s);

		const bandsBySection = new Map<string, any[]>();
		for (const b of allBands) {
			const arr = bandsBySection.get(b.sectionId) || [];
			arr.push(b);
			bandsBySection.set(b.sectionId, arr);
		}

		const corridorMap = new Map<string, any>();
		for (const c of corridors) corridorMap.set(c.id, c);
		const watershedMap = new Map<string, any>();
		for (const w of watersheds) watershedMap.set(w.id, w);
		const riverWatershedMap = new Map<string, string | null>();
		for (const r of rivers) riverWatershedMap.set(r.id, (r as any).watershedId || null);

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

				const corridor = section.corridorId ? corridorMap.get(section.corridorId) : null;
				const watershedSlug = corridor?.watershedId
					|| riverWatershedMap.get(section.riverId)
					|| null;
				const watershed = watershedSlug ? watershedMap.get(watershedSlug) : null;

				const logCount = myLogCounts.get(section.id);
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
					watershedSlug: watershedSlug || null,
					watershedName: watershed?.name || null,
					corridorSlug: section.corridorId || null,
					corridorName: corridor?.name || null,
					corridorSortIndex: corridor?.sortIndex ?? 999,
					sortIndex: section.sortIndex ?? 999,
					driver: section.driver || corridor?.driver || null,
					myTripCount: logCount?.count ?? 0,
					lastLoggedAt: logCount?.lastLoggedAt ?? null,
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

			sectionData.sort((a, b) => {
				const ai = (a as any).corridorSortIndex ?? 999;
				const bi = (b as any).corridorSortIndex ?? 999;
				if (ai !== bi) return ai - bi;
				return ((a as any).sortIndex ?? 999) - ((b as any).sortIndex ?? 999);
			});

			if (sectionData.length > 0) {
				dashboard.push({
					id: river.id,
					name: river.name,
					description: river.description,
					watershedId: (river as any).watershedId || null,
					sections: sectionData,
				});
			}
		}

		dashboard.sort((a, b) => a.name.localeCompare(b.name));

		const watershedSummaries = watersheds.map(w => ({
			id: w.id,
			name: w.name,
			region: w.region,
			description: w.description,
			dominantDriver: w.dominantDriver,
		}));

		const corridorSummaries = corridors.map(c => ({
			id: c.id,
			name: c.name,
			shortName: c.shortName,
			watershedId: c.watershedId,
			riverId: c.riverId,
			driver: c.driver,
		}));

		const result = {
			generated_at: new Date().toISOString(),
			rivers: dashboard,
			watersheds: watershedSummaries,
			corridors: corridorSummaries,
		};
		// L004 refinement: don't pin an empty assembly in cache. If any upstream
		// scan (rivers/watersheds/corridors) came back empty due to post-restart
		// lag, the dashboard would render with the "Other 36 sections" fallback;
		// caching that locks the bad view in for the full TTL.
		// Only the anonymous (no userId) variant is cacheable; per-user log counts must not bleed.
		if (!userId && dashboard.length > 0 && watersheds.length > 0 && corridors.length > 0) {
			cachedResult = result;
			cacheTimestamp = Date.now();
		}
		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': userId ? 'private, max-age=0, must-revalidate' : 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	}
}
