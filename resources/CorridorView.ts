import { Resource, tables } from 'harper';
import { getCorridorById } from '../lib/corridors.ts';
import { getWatershedById } from '../lib/watersheds.ts';
import { loadAllBands, resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';
import { getFlowStatus } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

export class CorridorView extends Resource {
	allowRead() { return true; }
	async get(target?: any) {
		const id = target?.id;
		if (!id) return new Response('corridor id required in URL path', { status: 400 });

		const corridor = await getCorridorById(id);
		if (!corridor) return new Response('Corridor not found', { status: 404 });

		const watershed = corridor.watershedId ? await getWatershedById(corridor.watershedId) : null;

		const [allSections, allSnapshots, allBands, allAps, allDams, allGauges, allShuttleBusinesses, allOutfitters] = await Promise.all([
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.GaugeSnapshot.search({ conditions: [] })),
			loadAllBands(),
			collect(tables.AccessPoint.search({ conditions: [] })),
			collect(tables.ImpassablePoint.search({ conditions: [] })),
			collect(tables.Gauge.search({ conditions: [] })),
			collect((tables as any).ShuttleBusiness.search({ conditions: [] })),
			collect((tables as any).Outfitter.search({ conditions: [] })),
		]);
		const snapshotMap = new Map<string, any>();
		for (const s of allSnapshots) snapshotMap.set(s.id, s);
		const bandsBySection = new Map<string, any[]>();
		for (const b of allBands) {
			const arr = bandsBySection.get(b.sectionId) || [];
			arr.push(b);
			bandsBySection.set(b.sectionId, arr);
		}
		const apById = new Map<string, any>();
		for (const ap of allAps) apById.set((ap as any).id, ap);

		const corridorAps = allAps
			.filter((ap: any) => ap.corridorId === id)
			.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map((ap: any) => ({
				id: ap.id,
				name: ap.name,
				altNames: ap.altNames || '',
				kind: ap.kind,
				sortIndex: ap.sortIndex ?? 0,
				latitude: ap.latitude ?? null,
				longitude: ap.longitude ?? null,
				riverMile: ap.riverMile ?? null,
				fee: ap.fee ?? null,
				vehicleAccess: ap.vehicleAccess ?? null,
				notes: ap.notes || '',
				// Contributable fields + provenance (slice 21)
				directions: ap.directions ?? null,
				permitRequired: ap.permitRequired ?? null,
				feeUsd: ap.feeUsd ?? null,
				parkingSpaces: ap.parkingSpaces ?? null,
				lastVerifiedAt: ap.lastVerifiedAt ?? null,
				verifiedBy: ap.verifiedBy ?? null,
				currentContributionId: ap.currentContributionId ?? null,
			}));

		const corridorDams = allDams
			.filter((d: any) => d.upstreamCorridorId === id || d.downstreamCorridorId === id)
			.map((d: any) => ({
				id: d.id,
				name: d.name,
				kind: d.kind,
				upstreamCorridorId: d.upstreamCorridorId ?? null,
				downstreamCorridorId: d.downstreamCorridorId ?? null,
				latitude: d.latitude ?? null,
				longitude: d.longitude ?? null,
				riverMile: d.riverMile ?? null,
				notes: d.notes || '',
				position: d.upstreamCorridorId === id ? 'downstream-end'
					: d.downstreamCorridorId === id ? 'upstream-end'
					: 'unknown',
			}));

		const corridorGauges = allGauges
			.filter((g: any) => g.corridorId === id)
			.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map((g: any) => {
				const snap = snapshotMap.get(g.id);
				let sparkline: number[] = [];
				try { if (snap?.sparkline) sparkline = JSON.parse(snap.sparkline); } catch {}
				return {
					id: g.id,
					name: g.name,
					sortIndex: g.sortIndex ?? 0,
					latitude: g.latitude ?? null,
					longitude: g.longitude ?? null,
					riverMile: g.riverMile ?? null,
					source: g.source,
					currentFlow: snap?.currentFlow ?? null,
					unit: snap?.unit ?? 'cfs',
					trend: snap?.trend ?? 'unknown',
					change24h: snap?.change24h ?? null,
					sparkline,
					updatedAt: snap?.updatedAt ?? null,
				};
			});

		// Helper: filter entities by serviceCorridorIds JSON array containing this corridorId.
		function servicesCorridor(entity: any): boolean {
			if (!entity.serviceCorridorIds) return false;
			try {
				const ids: string[] = JSON.parse(entity.serviceCorridorIds);
				return Array.isArray(ids) && ids.includes(id);
			} catch {
				return false;
			}
		}

		const corridorShuttleBusinesses = allShuttleBusinesses
			.filter(servicesCorridor)
			.map((s: any) => ({
				id: s.id,
				name: s.name,
				slug: s.slug ?? null,
				phone: s.phone ?? null,
				website: s.website ?? null,
				serviceCorridorIds: s.serviceCorridorIds ?? null,
				ratesJson: s.ratesJson ?? null,
				notes: s.notes ?? null,
				lastVerifiedAt: s.lastVerifiedAt ?? null,
				verifiedBy: s.verifiedBy ?? null,
				currentContributionId: s.currentContributionId ?? null,
			}));

		const corridorOutfitters = allOutfitters
			.filter(servicesCorridor)
			.map((o: any) => ({
				id: o.id,
				name: o.name,
				slug: o.slug ?? null,
				licenseNumber: o.licenseNumber ?? null,
				licenseState: o.licenseState ?? null,
				phone: o.phone ?? null,
				website: o.website ?? null,
				serviceCorridorIds: o.serviceCorridorIds ?? null,
				tripTypesJson: o.tripTypesJson ?? null,
				notes: o.notes ?? null,
				lastVerifiedAt: o.lastVerifiedAt ?? null,
				verifiedBy: o.verifiedBy ?? null,
				currentContributionId: o.currentContributionId ?? null,
			}));

		const sections = allSections
			.filter((s: any) => s.corridorId === id)
			.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map((section: any) => {
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
				const fromAp = section.fromAccessPointId ? apById.get(section.fromAccessPointId) : null;
				const toAp = section.toAccessPointId ? apById.get(section.toAccessPointId) : null;
				const startMile = fromAp?.riverMile ?? null;
				const endMile = toAp?.riverMile ?? null;
				return {
					id: section.id,
					name: section.name,
					corridorId: section.corridorId,
					parentSectionId: section.parentSectionId ?? null,
					sortIndex: section.sortIndex ?? 0,
					difficulty: section.difficultyMax !== section.difficultyMin
						? `${section.difficultyMin}-${section.difficultyMax}`
						: section.difficultyMin,
					difficultyMin: section.difficultyMin,
					difficultyMax: section.difficultyMax,
					lengthMiles: section.lengthMiles,
					fromAccessPointId: section.fromAccessPointId ?? null,
					toAccessPointId: section.toAccessPointId ?? null,
					corridorMileSpan: { startMile, endMile },
					currentFlow,
					unit: snap?.unit || 'cfs',
					trend: snap?.trend || 'unknown',
					change24h: snap?.change24h ?? null,
					status,
					statusLabel,
					primaryGaugeId: section.primaryGaugeId,
					latitude: section.latitude,
					longitude: section.longitude,
					sparkline,
					updatedAt: snap?.updatedAt || null,
					gaugeName: snap?.gaugeName || null,
					flowBands: sectionBands,
					flowLow: section.flowLow ?? null,
					flowRunnable: section.flowRunnable ?? null,
					flowIdealMin: section.flowIdealMin ?? null,
					flowIdealMax: section.flowIdealMax ?? null,
					flowHigh: section.flowHigh ?? null,
					flowExpert: section.flowExpert ?? null,
					flowDangerous: section.flowDangerous ?? null,
					putIn: section.putIn,
					takeOut: section.takeOut,
					notes: section.notes || '',
				};
			});

		const breadcrumb = [
			{ slug: 'colorado', name: 'Colorado', href: '/' },
			...(watershed ? [{ slug: watershed.id, name: watershed.name, href: `/watershed/${watershed.id}` }] : []),
			{ slug: corridor.id, name: corridor.name, href: `/corridor/${corridor.id}` },
		];

		const result = {
			corridor,
			watershed,
			sections,
			accessPoints: corridorAps,
			impassableDams: corridorDams,
			gauges: corridorGauges,
			shuttleBusinesses: corridorShuttleBusinesses,
			outfitters: corridorOutfitters,
			weatherSummary: null,
			breadcrumb,
		};
		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	}
}
