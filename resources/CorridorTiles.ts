import { Resource, tables } from 'harper';
import { getFlowStatus } from '../lib/utils.ts';
import { resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';
import { listWatersheds } from '../lib/watersheds.ts';
import { listCorridors } from '../lib/corridors.ts';
import { canUserAccessTrip } from '../lib/log/participant-pure.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

let cachedResult: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60_000;

export function invalidateCorridorTilesCache() {
	cachedResult = null;
	cacheTimestamp = 0;
}

async function getMyLogCountsBySection(userId: string | null): Promise<Map<string, number>> {
	const out = new Map<string, number>();
	if (!userId) return out;
	for await (const p of tables.TripParticipant.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	})) {
		if (canUserAccessTrip(p) !== 'accepted') continue;
		const log = await tables.RiverLog.get((p as any).tripId);
		if (!log) continue;
		const sid = (log as any).sectionId;
		if (!sid) continue;
		out.set(sid, (out.get(sid) || 0) + 1);
	}
	return out;
}

export class CorridorTiles extends Resource {
	allowRead() { return true; }
	async get() {
		const userId = (this.getContext() as any)?.session?.user || null;

		const now = Date.now();
		const usePublicCache = !userId && cachedResult && (now - cacheTimestamp) < CACHE_TTL_MS;
		if (usePublicCache) {
			return new Response(JSON.stringify(cachedResult), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
				},
			});
		}

		const [rivers, sections, accessPoints, impassablePoints, gauges, snapshots, allBands, watersheds, corridors, myLogCounts] = await Promise.all([
			collect(tables.River.search({ conditions: [] })),
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.AccessPoint.search({ conditions: [] })),
			collect(tables.ImpassablePoint.search({ conditions: [] })),
			collect(tables.Gauge.search({ conditions: [] })),
			collect(tables.GaugeSnapshot.search({ conditions: [] })),
			collect(tables.FlowBand.search({ conditions: [] })),
			listWatersheds(),
			listCorridors(),
			getMyLogCountsBySection(userId),
		]);

		const snapshotMap = new Map<string, any>();
		for (const s of snapshots) snapshotMap.set(s.id, s);

		const bandsBySection = new Map<string, any[]>();
		for (const b of allBands) {
			const arr = bandsBySection.get(b.sectionId) || [];
			arr.push(b);
			bandsBySection.set(b.sectionId, arr);
		}

		const riverMap = new Map<string, any>();
		for (const r of rivers) riverMap.set(r.id, r);
		const watershedMap = new Map<string, any>();
		for (const w of watersheds) watershedMap.set(w.id, w);
		const gaugeMap = new Map<string, any>();
		for (const g of gauges) gaugeMap.set(g.id, g);

		const sectionsByCorridor = new Map<string, any[]>();
		for (const s of sections) {
			if (!s.corridorId) continue;
			const arr = sectionsByCorridor.get(s.corridorId) || [];
			arr.push(s);
			sectionsByCorridor.set(s.corridorId, arr);
		}

		const apsByCorridor = new Map<string, any[]>();
		for (const ap of accessPoints) {
			if (!ap.corridorId) continue;
			const arr = apsByCorridor.get(ap.corridorId) || [];
			arr.push(ap);
			apsByCorridor.set(ap.corridorId, arr);
		}

		const gaugesByCorridor = new Map<string, any[]>();
		for (const g of gauges) {
			if (!g.corridorId) continue;
			const arr = gaugesByCorridor.get(g.corridorId) || [];
			arr.push(g);
			gaugesByCorridor.set(g.corridorId, arr);
		}

		// A dam appears on its upstream corridor as a "break" marker at the
		// downstream end and on its downstream corridor at the upstream end.
		const damsByCorridor = new Map<string, any[]>();
		const pushDam = (corridorId: string | null | undefined, dam: any, position: 'downstream-end' | 'upstream-end') => {
			if (!corridorId) return;
			const arr = damsByCorridor.get(corridorId) || [];
			arr.push({ ...dam, position });
			damsByCorridor.set(corridorId, arr);
		};
		for (const ip of impassablePoints) {
			pushDam(ip.upstreamCorridorId, ip, 'downstream-end');
			if (ip.downstreamCorridorId && ip.downstreamCorridorId !== ip.upstreamCorridorId) {
				pushDam(ip.downstreamCorridorId, ip, 'upstream-end');
			}
		}

		const apByIdLookup = new Map<string, any>();
		for (const ap of accessPoints) apByIdLookup.set((ap as any).id, ap);

		const buildLeg = (section: any) => {
			const snap = section.primaryGaugeId ? snapshotMap.get(section.primaryGaugeId) : null;
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
			const primaryGauge = section.primaryGaugeId ? gaugeMap.get(section.primaryGaugeId) : null;
			const difficultyLabel = section.difficultyMax && section.difficultyMin && section.difficultyMax !== section.difficultyMin
				? `${section.difficultyMin}–${section.difficultyMax}`
				: (section.difficultyMin || section.difficultyMax || '');
			const fromAp = section.fromAccessPointId ? apByIdLookup.get(section.fromAccessPointId) : null;
			const toAp = section.toAccessPointId ? apByIdLookup.get(section.toAccessPointId) : null;
			return {
				sectionId: section.id,
				name: section.name,
				parentSectionId: section.parentSectionId || null,
				difficultyMin: section.difficultyMin,
				difficultyMax: section.difficultyMax,
				difficultyLabel,
				lengthMiles: section.lengthMiles,
				fromAccessPointId: section.fromAccessPointId || null,
				toAccessPointId: section.toAccessPointId || null,
				corridorMileSpan: { startMile: fromAp?.riverMile ?? null, endMile: toAp?.riverMile ?? null },
				sortIndex: section.sortIndex ?? 999,
				status,
				statusLabel,
				notes: section.notes || '',
				primaryGaugeId: section.primaryGaugeId || null,
				primaryGaugeName: primaryGauge?.name || snap?.gaugeName || null,
				currentFlow,
				unit: snap?.unit || 'cfs',
				trend: snap?.trend || 'unknown',
				change24h: snap?.change24h ?? null,
				sparkline,
				updatedAt: snap?.updatedAt || null,
				thresholds: {
					flowLow: section.flowLow,
					flowRunnable: section.flowRunnable,
					flowIdealMin: section.flowIdealMin,
					flowIdealMax: section.flowIdealMax,
					flowHigh: section.flowHigh,
					flowExpert: section.flowExpert,
					flowDangerous: section.flowDangerous,
				},
				myTripCount: myLogCounts.get(section.id) || 0,
			};
		};

		const buildGauge = (gauge: any) => {
			const snap = snapshotMap.get(gauge.id);
			const currentFlow = snap?.currentFlow ?? null;
			let sparkline: number[] = [];
			try {
				if (snap?.sparkline) sparkline = JSON.parse(snap.sparkline);
			} catch {}
			return {
				id: gauge.id,
				name: gauge.name,
				sortIndex: gauge.sortIndex ?? 999,
				latitude: gauge.latitude,
				longitude: gauge.longitude,
				riverMile: gauge.riverMile ?? null,
				source: gauge.source,
				currentFlow,
				unit: snap?.unit || gauge.unit || 'cfs',
				trend: snap?.trend || 'unknown',
				change24h: snap?.change24h ?? null,
				sparkline,
				updatedAt: snap?.updatedAt || null,
			};
		};

		const tiles = corridors.map(corridor => {
			const corridorSections = (sectionsByCorridor.get(corridor.id) || [])
				.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999));
			const corridorAPs = (apsByCorridor.get(corridor.id) || [])
				.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
				.map((ap: any) => ({
					id: ap.id,
					name: ap.name,
					altNames: ap.altNames || '',
					kind: ap.kind,
					sortIndex: ap.sortIndex ?? 999,
					latitude: ap.latitude,
					longitude: ap.longitude,
					riverMile: ap.riverMile,
					fee: ap.fee,
					vehicleAccess: ap.vehicleAccess,
					notes: ap.notes || '',
				}));
			const corridorGauges = (gaugesByCorridor.get(corridor.id) || [])
				.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
				.map(buildGauge);
			const corridorDams = (damsByCorridor.get(corridor.id) || []).map((d: any) => ({
				id: d.id,
				name: d.name,
				kind: d.kind,
				position: d.position,
				latitude: d.latitude,
				longitude: d.longitude,
				riverMile: d.riverMile,
				notes: d.notes,
			}));
			const legs = corridorSections.map(buildLeg);
			const river = corridor.riverId ? riverMap.get(corridor.riverId) : null;
			const watershed = corridor.watershedId ? watershedMap.get(corridor.watershedId) : null;
			const myTripCount = legs.reduce((sum: number, l: any) => sum + (l.myTripCount || 0), 0);
			return {
				corridorId: corridor.id,
				name: corridor.name,
				shortName: corridor.shortName,
				description: corridor.description,
				driver: corridor.driver,
				sortIndex: corridor.sortIndex ?? 999,
				riverId: corridor.riverId,
				riverName: river?.name || null,
				watershedId: corridor.watershedId,
				watershedName: watershed?.name || null,
				accessPoints: corridorAPs,
				legs,
				gauges: corridorGauges,
				impassableDams: corridorDams,
				myTripCount,
			};
		});

		tiles.sort((a, b) => {
			const aw = a.watershedName || '';
			const bw = b.watershedName || '';
			if (aw !== bw) return aw.localeCompare(bw);
			return (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
		});

		const result = {
			generated_at: new Date().toISOString(),
			tiles,
		};
		if (!userId && tiles.length > 0) {
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
