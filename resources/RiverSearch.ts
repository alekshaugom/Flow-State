import { Resource, tables } from 'harper';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

interface SearchHit {
	kind: 'section' | 'river' | 'watershed' | 'corridor';
	id: string;
	name: string;
	right: string;
	href: string;
	rank: number;
}

// Per-bucket caps.
const CO_RIVERS_MAX = 3;
const CO_SECTIONS_MAX = 1;
const CO_WATERSHEDS_MAX = 1;
const CO_CORRIDORS_MAX = 1;

// Ranks. Lower is better.
const RANK_EXACT_NAME = 0;
const RANK_STARTS_WITH_NAME = 1;
const RANK_CONTAINS_NAME = 3;
const RANK_STARTS_WITH_GEO = 5;   // region/state
const RANK_CONTAINS_GEO = 6;

function nameRank(q: string, name: string | null | undefined): number | null {
	if (!name) return null;
	const h = name.toLowerCase();
	if (h === q) return RANK_EXACT_NAME;
	if (h.startsWith(q)) return RANK_STARTS_WITH_NAME;
	if (h.includes(q)) return RANK_CONTAINS_NAME;
	return null;
}

function geoRank(q: string, field: string | null | undefined): number | null {
	if (!field) return null;
	const h = field.toLowerCase();
	if (h === q || h.startsWith(q)) return RANK_STARTS_WITH_GEO;
	if (h.includes(q)) return RANK_CONTAINS_GEO;
	return null;
}

function bestOf(...ranks: Array<number | null>): number | null {
	let best: number | null = null;
	for (const r of ranks) if (r !== null && (best === null || r < best)) best = r;
	return best;
}

function takeTop<T>(items: T[], n: number): T[] {
	return items.slice(0, n);
}

export class RiverSearch extends Resource {
	allowRead() { return true; }

	async get(target?: any) {
		const qRaw = (typeof target?.get === 'function' ? target.get('q') : target?.q) || '';
		const q = String(qRaw).trim().toLowerCase();
		if (q.length < 1) {
			return { colorado: [], america: [], worldwide: [], query: '', limits: { colorado: 0, america: 0, worldwide: 0 } };
		}

		// Load Colorado-side tables (small, in-memory).
		const [sections, rivers, watersheds, corridors] = await Promise.all([
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.River.search({ conditions: [] })),
			collect(tables.Watershed.search({ conditions: [] })),
			collect(tables.RiverCorridor.search({ conditions: [] })),
		]);

		const riverNameById = new Map<string, string>();
		const riverDifficultyById = new Map<string, string>();
		for (const r of rivers) riverNameById.set((r as any).id, (r as any).name);
		const watershedNameById = new Map<string, string>();
		for (const w of watersheds) watershedNameById.set((w as any).id, (w as any).name);

		// Pick the most-upstream section for each river so a "Colorado River"
		// search hit can navigate somewhere real (we don't have a river-level
		// page; the first section is a reasonable landing point).
		const firstSectionByRiverId = new Map<string, string>();
		const sortedSections = [...sections].sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999));
		for (const s of sortedSections as any[]) {
			if (s.riverId && !firstSectionByRiverId.has(s.riverId)) {
				firstSectionByRiverId.set(s.riverId, s.id);
			}
		}

		// Helper to format "Class X-Y" from min/max.
		const formatClass = (s: any): string | null => {
			if (!s.difficultyMin && !s.difficultyMax) return null;
			if (s.difficultyMin === s.difficultyMax || !s.difficultyMax) return `Class ${s.difficultyMin}`;
			return `Class ${s.difficultyMin}-${s.difficultyMax}`;
		};

		// Colorado matches — restrict to NAME-only matching per spec.
		const coRiverHits: SearchHit[] = [];
		const coSectionHits: SearchHit[] = [];
		const coWatershedHits: SearchHit[] = [];
		const coCorridorHits: SearchHit[] = [];

		for (const r of rivers as any[]) {
			const rank = nameRank(q, r.name);
			if (rank === null) continue;
			const landingSectionId = firstSectionByRiverId.get(r.id);
			if (!landingSectionId) continue; // skip rivers with no sections — no destination
			coRiverHits.push({
				kind: 'river',
				id: r.id,
				name: r.name,
				right: `River · ${r.state || 'Colorado'}`,
				href: `/section/${landingSectionId}`,
				rank,
			});
		}

		for (const s of sections as any[]) {
			const rank = nameRank(q, s.name);
			if (rank === null) continue;
			const cls = formatClass(s);
			const riverName = riverNameById.get(s.riverId) || '';
			const right = [cls, riverName || 'Colorado'].filter(Boolean).join(' · ');
			coSectionHits.push({
				kind: 'section',
				id: s.id,
				name: s.name,
				right,
				href: `/section/${s.id}`,
				rank,
			});
		}

		for (const w of watersheds as any[]) {
			const rank = bestOf(nameRank(q, w.name), geoRank(q, w.region));
			if (rank === null) continue;
			coWatershedHits.push({
				kind: 'watershed',
				id: w.id,
				name: w.name,
				right: w.region ? `Watershed · ${w.region}` : 'Watershed',
				href: `/watershed/${w.id}`,
				rank,
			});
		}

		for (const c of corridors as any[]) {
			const rank = nameRank(q, c.name);
			if (rank === null) continue;
			const ws = watershedNameById.get(c.watershedId) || '';
			coCorridorHits.push({
				kind: 'corridor',
				id: c.id,
				name: c.name,
				right: ws ? `Corridor · ${ws}` : 'Corridor',
				href: `/corridor/${c.id}`,
				rank,
			});
		}

		// Sort each kind by (rank, name) and apply per-kind caps.
		const byRankThenName = (a: SearchHit, b: SearchHit) => a.rank - b.rank || a.name.localeCompare(b.name);
		coRiverHits.sort(byRankThenName);
		coSectionHits.sort(byRankThenName);
		coWatershedHits.sort(byRankThenName);
		coCorridorHits.sort(byRankThenName);

		const colorado: SearchHit[] = [
			...takeTop(coRiverHits, CO_RIVERS_MAX),
			...takeTop(coSectionHits, CO_SECTIONS_MAX),
			...takeTop(coWatershedHits, CO_WATERSHEDS_MAX),
			...takeTop(coCorridorHits, CO_CORRIDORS_MAX),
		];

		return {
			colorado,
			america: [],
			worldwide: [],
			query: q,
			limits: { colorado: colorado.length, america: 0, worldwide: 0 },
		};
	}
}
