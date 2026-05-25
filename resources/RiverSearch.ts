import { Resource, tables } from 'harper';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

interface SearchHit {
	kind: 'section' | 'river' | 'watershed' | 'corridor' | 'world-river';
	id: string;
	name: string;
	right: string;
	href: string;
	rank: number;
	country?: string;
	isoCountry?: string;
	region?: string | null;
}

// Per-bucket caps.
const CO_RIVERS_MAX = 3;
const CO_SECTIONS_MAX = 1;
const CO_WATERSHEDS_MAX = 1;
const CO_CORRIDORS_MAX = 1;
const US_MAX = 3;
const WORLD_MAX = 3;

// Ranks. Lower is better.
const RANK_EXACT_NAME = 0;
const RANK_STARTS_WITH_NAME = 1;
const RANK_STARTS_WITH_ALT = 2;
const RANK_CONTAINS_NAME = 3;
const RANK_CONTAINS_ALT = 4;
const RANK_STARTS_WITH_GEO = 5;   // country/region/state
const RANK_CONTAINS_GEO = 6;

function nameRank(q: string, name: string | null | undefined): number | null {
	if (!name) return null;
	const h = name.toLowerCase();
	if (h === q) return RANK_EXACT_NAME;
	if (h.startsWith(q)) return RANK_STARTS_WITH_NAME;
	if (h.includes(q)) return RANK_CONTAINS_NAME;
	return null;
}

function altRank(q: string, alt: string | null | undefined): number | null {
	if (!alt) return null;
	const h = alt.toLowerCase();
	if (h === q || h.startsWith(q)) return RANK_STARTS_WITH_ALT;
	if (h.includes(q)) return RANK_CONTAINS_ALT;
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

// Strip common suffixes / formatting so "Colorado", "Colorado River", and
// "Colorado - Main" all collide for dedupe between Colorado and US buckets.
function normalizeNameForDedupe(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s*-\s*(main|middle fork|north fork|south fork|east fork|west fork|upper|lower)$/i, '')
		.replace(/\s+(river|creek|fork|brook|run|wash|stream)$/i, '')
		.replace(/\s+/g, ' ')
		.trim();
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

		// Build the set of names to exclude from the US bucket: every active
		// Colorado river (whether or not it matched the current query). This way
		// "Animas" can never show in US while we already serve it natively.
		const coNames = new Set<string>();
		for (const r of rivers as any[]) coNames.add(normalizeNameForDedupe(r.name));
		for (const h of colorado) coNames.add(normalizeNameForDedupe(h.name));

		// World — name + altName + country/region matching only.
		const worldHits: SearchHit[] = [];
		const seenIds = new Set<string>();

		const pushFromRow = (r: any) => {
			if (seenIds.has(r.id)) return;
			let altNames: string[] = [];
			try { altNames = JSON.parse(r.alternateNamesJson || '[]'); } catch {}
			const rank = bestOf(
				nameRank(q, r.nameLower),
				...altNames.map(a => altRank(q, a.toLowerCase())),
				geoRank(q, (r.country || '').toLowerCase()),
				geoRank(q, (r.region || '').toLowerCase()),
			);
			if (rank === null) return;
			seenIds.add(r.id);
			const cls = r.difficulty || null;
			const loc = r.region || r.country;
			const right = [cls, loc].filter(Boolean).join(' · ');
			worldHits.push({
				kind: 'world-river',
				id: r.id,
				name: r.name,
				right,
				href: `/river/${encodeURIComponent(r.id)}`,
				rank,
				country: r.country,
				isoCountry: r.isoCountry,
				region: r.region || null,
			});
		};

		// Pass 1: prefix on nameLower (indexed).
		try {
			for await (const w of tables.WorldRiver.search({
				conditions: [{ attribute: 'nameLower', value: q, comparator: 'starts_with' as const }],
				limit: 200,
			})) {
				pushFromRow(w as any);
			}
		} catch {}

		// Pass 2: contains scan, capped.
		if (worldHits.length < (US_MAX + WORLD_MAX) * 3) {
			let scanned = 0;
			for await (const w of tables.WorldRiver.search({ conditions: [], limit: 5000 })) {
				if (++scanned > 5000) break;
				pushFromRow(w as any);
				if (worldHits.length >= 200) break;
			}
		}

		worldHits.sort(byRankThenName);

		// Filter US-bucket against CO names to avoid dupes (e.g. "Colorado River"
		// appearing in both Colorado and United States).
		const america = takeTop(
			worldHits.filter(h => h.isoCountry === 'US' && !coNames.has(normalizeNameForDedupe(h.name))),
			US_MAX,
		);
		const worldwide = takeTop(
			worldHits.filter(h => h.isoCountry !== 'US'),
			WORLD_MAX,
		);

		return {
			colorado,
			america,
			worldwide,
			query: q,
			limits: { colorado: colorado.length, america: america.length, worldwide: worldwide.length },
		};
	}
}
