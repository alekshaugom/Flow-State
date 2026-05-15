import { Resource, tables } from 'harper';
import { getWatershedById } from '../lib/watersheds.ts';
import { getCorridorsForWatershed } from '../lib/corridors.ts';
import { loadAllBands, resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';
import { getFlowStatus } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

export class WatershedView extends Resource {
	allowRead() { return true; }
	async get(target?: any) {
		const id = target?.id;
		if (!id) return new Response('watershed id required in URL path', { status: 400 });

		const watershed = await getWatershedById(id);
		if (!watershed) return new Response('Watershed not found', { status: 404 });

		const corridors = (await getCorridorsForWatershed(id))
			.slice()
			.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999));

		// Full-scan + filter for sections + snapshots + bands (L004 pattern).
		const [allSections, allSnapshots, allBands] = await Promise.all([
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.GaugeSnapshot.search({ conditions: [] })),
			loadAllBands(),
		]);
		const snapshotMap = new Map<string, any>();
		for (const s of allSnapshots) snapshotMap.set(s.id, s);
		const bandsBySection = new Map<string, any[]>();
		for (const b of allBands) {
			const arr = bandsBySection.get(b.sectionId) || [];
			arr.push(b);
			bandsBySection.set(b.sectionId, arr);
		}

		const corridorPayload = corridors.map(c => {
			const sections = allSections
				.filter((s: any) => s.corridorId === c.id)
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
					return {
						id: section.id,
						name: section.name,
						corridorId: section.corridorId,
						difficulty: section.difficultyMax !== section.difficultyMin
							? `${section.difficultyMin}-${section.difficultyMax}`
							: section.difficultyMin,
						lengthMiles: section.lengthMiles,
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
					};
				});
			return { ...c, sections };
		});

		const result = {
			watershed,
			corridors: corridorPayload,
			breadcrumb: [
				{ slug: 'colorado', name: 'Colorado', href: '/' },
				{ slug: watershed.id, name: watershed.name, href: `/watershed/${watershed.id}` },
			],
		};
		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	}
}
