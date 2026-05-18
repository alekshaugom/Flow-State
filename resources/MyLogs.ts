import { Resource, tables } from 'harper';
import { listWatersheds } from '../lib/watersheds.ts';
import { listCorridors } from '../lib/corridors.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

function yearOf(dateStr: string | null | undefined): number | null {
	if (!dateStr || typeof dateStr !== 'string') return null;
	const y = parseInt(dateStr.slice(0, 4), 10);
	return Number.isFinite(y) ? y : null;
}

export class MyLogsView extends Resource {
	allowRead() { return true; }

	async get() {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const [logs, sections, watersheds, corridors, profile] = await Promise.all([
			collect(tables.RiverLog.search({
				conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
			})),
			collect(tables.RiverSection.search({ conditions: [] })),
			listWatersheds(),
			listCorridors(),
			tables.UserProfile.get(userId),
		]);

		const sectionMap = new Map<string, any>();
		for (const s of sections) sectionMap.set((s as any).id, s);
		const corridorMap = new Map<string, any>();
		for (const c of corridors) corridorMap.set(c.id, c);
		const watershedMap = new Map<string, any>();
		for (const w of watersheds) watershedMap.set(w.id, w);

		// Sort logs once: newest first by start date, then by createdAt.
		logs.sort((a: any, b: any) =>
			(b.date || '').localeCompare(a.date || '') ||
			(b.createdAt || '').localeCompare(a.createdAt || ''),
		);

		// Build watershed → corridor → section group structure.
		type SectionAgg = { sectionId: string; name: string; tripCount: number; lastTripAt: string | null };
		type CorridorAgg = { corridorId: string; name: string; sectionMap: Map<string, SectionAgg>; tripCount: number; lastTripAt: string | null };
		type WatershedAgg = { watershedId: string; name: string; corridorMap: Map<string, CorridorAgg>; tripCount: number; lastTripAt: string | null; sectionCount: number };

		const watershedAggs = new Map<string, WatershedAgg>();
		const unfiledWatershed: WatershedAgg = { watershedId: '__unfiled__', name: 'Other', corridorMap: new Map(), tripCount: 0, lastTripAt: null, sectionCount: 0 };
		const sectionsSeen = new Set<string>();

		for (const log of logs) {
			const sectionId = (log as any).sectionId;
			const section = sectionId ? sectionMap.get(sectionId) : null;
			const watershedId = (log as any).watershedId
				|| (section?.corridorId ? corridorMap.get(section.corridorId)?.watershedId : null)
				|| null;
			const corridorId = (log as any).corridorId || section?.corridorId || null;
			const watershedName = watershedId ? watershedMap.get(watershedId)?.name : null;
			const corridorName = corridorId ? corridorMap.get(corridorId)?.name : null;
			const sectionName = section?.name || sectionId;
			const tripDate = (log as any).date || null;

			const wId = watershedId || '__unfiled__';
			let wAgg = watershedAggs.get(wId);
			if (!wAgg) {
				wAgg = wId === '__unfiled__'
					? unfiledWatershed
					: { watershedId: wId, name: watershedName || wId, corridorMap: new Map(), tripCount: 0, lastTripAt: null, sectionCount: 0 };
				watershedAggs.set(wId, wAgg);
			}
			wAgg.tripCount += 1;
			if (!wAgg.lastTripAt || (tripDate && tripDate > wAgg.lastTripAt)) wAgg.lastTripAt = tripDate;

			const cId = corridorId || '__unfiled__';
			let cAgg = wAgg.corridorMap.get(cId);
			if (!cAgg) {
				cAgg = { corridorId: cId, name: corridorName || (cId === '__unfiled__' ? 'Other' : cId), sectionMap: new Map(), tripCount: 0, lastTripAt: null };
				wAgg.corridorMap.set(cId, cAgg);
			}
			cAgg.tripCount += 1;
			if (!cAgg.lastTripAt || (tripDate && tripDate > cAgg.lastTripAt)) cAgg.lastTripAt = tripDate;

			const sId = sectionId || '__unfiled__';
			let sAgg = cAgg.sectionMap.get(sId);
			if (!sAgg) {
				sAgg = { sectionId: sId, name: sectionName || sId, tripCount: 0, lastTripAt: null };
				cAgg.sectionMap.set(sId, sAgg);
			}
			sAgg.tripCount += 1;
			if (!sAgg.lastTripAt || (tripDate && tripDate > sAgg.lastTripAt)) sAgg.lastTripAt = tripDate;

			const watershedSectionKey = `${wId}::${sId}`;
			if (!sectionsSeen.has(watershedSectionKey)) {
				sectionsSeen.add(watershedSectionKey);
				wAgg.sectionCount += 1;
			}
		}

		const watershedsOut = Array.from(watershedAggs.values()).map(w => ({
			watershedId: w.watershedId,
			name: w.name,
			tripCount: w.tripCount,
			sectionCount: w.sectionCount,
			lastTripAt: w.lastTripAt,
			corridors: Array.from(w.corridorMap.values()).map(c => ({
				corridorId: c.corridorId,
				name: c.name,
				tripCount: c.tripCount,
				lastTripAt: c.lastTripAt,
				sections: Array.from(c.sectionMap.values()).sort((a, b) => (b.lastTripAt || '').localeCompare(a.lastTripAt || '')),
			})).sort((a, b) => (b.lastTripAt || '').localeCompare(a.lastTripAt || '')),
		})).sort((a, b) => (b.lastTripAt || '').localeCompare(a.lastTripAt || ''));

		// Year groups: flat lists per year, newest-first.
		const yearAggs = new Map<number, { year: number; tripCount: number; logs: any[] }>();
		for (const log of logs) {
			const y = yearOf((log as any).date);
			if (y == null) continue;
			let yAgg = yearAggs.get(y);
			if (!yAgg) {
				yAgg = { year: y, tripCount: 0, logs: [] };
				yearAggs.set(y, yAgg);
			}
			yAgg.tripCount += 1;
			yAgg.logs.push(log);
		}
		const yearGroups = Array.from(yearAggs.values())
			.sort((a, b) => b.year - a.year)
			.map(y => ({ year: y.year, tripCount: y.tripCount, logs: y.logs }));

		return {
			watersheds: watershedsOut,
			yearGroups,
			logs,
			homeWatershedId: (profile as any)?.homeWatershedId || null,
			profile: profile || null,
			generatedAt: new Date().toISOString(),
		};
	}
}
