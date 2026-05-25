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
	subtitle: string;
	href: string;
	rank: number;
	flowStatus?: string | null;
	country?: string;
	isoCountry?: string;
	region?: string | null;
}

function rankMatch(needle: string, haystack: string | null | undefined): number | null {
	if (!haystack) return null;
	const h = haystack.toLowerCase();
	if (h === needle) return 0;
	if (h.startsWith(needle)) return 1;
	if (h.includes(needle)) return 2;
	return null;
}

function bestRankAcross(needle: string, fields: Array<string | null | undefined>): number | null {
	let best: number | null = null;
	for (const f of fields) {
		const r = rankMatch(needle, f);
		if (r !== null && (best === null || r < best)) best = r;
	}
	return best;
}

export class RiverSearch extends Resource {
	allowRead() { return true; }

	async get(target?: any) {
		// target is a URLSearchParams-extending RequestTarget. Custom params live there.
		const qRaw = (typeof target?.get === 'function' ? target.get('q') : target?.q) || '';
		const q = String(qRaw).trim().toLowerCase();
		const limitParam = typeof target?.get === 'function' ? target.get('limit') : target?.limit;
		const parsedLimit = parseInt(String(limitParam || '12'), 10);
		const limit = Math.max(1, Math.min(50, Number.isFinite(parsedLimit) ? parsedLimit : 12));

		if (q.length < 1) {
			return { colorado: [], world: [], query: '', limits: { colorado: 0, world: 0 } };
		}

		// Pull Colorado-side tables (small, in-memory).
		const [sections, rivers, watersheds, corridors] = await Promise.all([
			collect(tables.RiverSection.search({ conditions: [] })),
			collect(tables.River.search({ conditions: [] })),
			collect(tables.Watershed.search({ conditions: [] })),
			collect(tables.RiverCorridor.search({ conditions: [] })),
		]);

		const riverNameById = new Map<string, string>();
		for (const r of rivers) riverNameById.set((r as any).id, (r as any).name);
		const watershedNameById = new Map<string, string>();
		for (const w of watersheds) watershedNameById.set((w as any).id, (w as any).name);

		const coloradoHits: SearchHit[] = [];

		for (const s of sections as any[]) {
			const riverName = riverNameById.get(s.riverId) || '';
			const rank = bestRankAcross(q, [s.name, riverName, s.putIn, s.takeOut, s.notes]);
			if (rank === null) continue;
			coloradoHits.push({
				kind: 'section',
				id: s.id,
				name: s.name,
				subtitle: riverName ? `${riverName} · Colorado` : 'Colorado',
				href: `/section/${s.id}`,
				rank,
			});
		}

		for (const r of rivers as any[]) {
			const rank = bestRankAcross(q, [r.name, r.description, r.watershed]);
			if (rank === null) continue;
			coloradoHits.push({
				kind: 'river',
				id: r.id,
				name: r.name,
				subtitle: r.state ? `${r.state} river` : 'Colorado river',
				href: `/section/${r.id}`, // not perfect — sends to dashboard scope, but rivers have no own page
				rank,
			});
		}

		for (const w of watersheds as any[]) {
			const rank = bestRankAcross(q, [w.name, w.region, w.description, w.hucCode]);
			if (rank === null) continue;
			coloradoHits.push({
				kind: 'watershed',
				id: w.id,
				name: w.name,
				subtitle: w.region ? `Watershed · ${w.region}` : 'Watershed',
				href: `/watershed/${w.id}`,
				rank,
			});
		}

		for (const c of corridors as any[]) {
			const rank = bestRankAcross(q, [c.name, c.shortName, c.driver]);
			if (rank === null) continue;
			const ws = watershedNameById.get(c.watershedId) || '';
			coloradoHits.push({
				kind: 'corridor',
				id: c.id,
				name: c.name,
				subtitle: ws ? `Corridor · ${ws}` : 'Corridor',
				href: `/corridor/${c.id}`,
				rank,
			});
		}

		coloradoHits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
		const colorado = coloradoHits.slice(0, limit);

		// World — search WorldRiver by nameLower, region, country.
		// Then split into America (US-only) and Worldwide (everything else).
		const worldHits: SearchHit[] = [];
		const seenIds = new Set<string>();

		function pushFromRow(r: any, rank: number) {
			if (seenIds.has(r.id)) return;
			seenIds.add(r.id);
			worldHits.push({
				kind: 'world-river',
				id: r.id,
				name: r.name,
				subtitle: subtitleForWorldRiver(r),
				href: `/river/${encodeURIComponent(r.id)}`,
				rank,
				country: r.country,
				isoCountry: r.isoCountry,
				region: r.region || null,
			});
		}

		// Pass 1: prefix on nameLower (fast indexed search).
		try {
			for await (const w of tables.WorldRiver.search({
				conditions: [{ attribute: 'nameLower', value: q, comparator: 'starts_with' as const }],
				limit: 400,
			})) {
				const r = w as any;
				const rank = rankMatch(q, r.nameLower);
				if (rank === null) continue;
				pushFromRow(r, rank);
			}
		} catch (err) {
			// starts_with may not be supported on all indexes — fall through to scan.
		}

		// Pass 2: contains scan, capped for performance.
		const totalWorldNeeded = limit * 2; // we'll split US vs non-US after ranking
		if (worldHits.length < totalWorldNeeded) {
			let scanned = 0;
			for await (const w of tables.WorldRiver.search({ conditions: [], limit: 6000 })) {
				if (++scanned > 6000) break;
				const r = w as any;
				if (seenIds.has(r.id)) continue;
				const altNames: string[] = (() => {
					try { return JSON.parse(r.alternateNamesJson || '[]'); } catch { return []; }
				})();
				const rank = bestRankAcross(q, [r.nameLower, ...altNames.map(n => n.toLowerCase()), (r.country || '').toLowerCase(), (r.region || '').toLowerCase(), (r.sections || '').toLowerCase()]);
				if (rank === null) continue;
				pushFromRow(r, rank);
				if (worldHits.length >= 400) break;
			}
		}

		worldHits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

		// Split: America = US rivers; Worldwide = everything else.
		const america = worldHits.filter(h => h.isoCountry === 'US').slice(0, limit);
		const worldwide = worldHits.filter(h => h.isoCountry !== 'US').slice(0, limit);

		return {
			colorado,
			america,
			worldwide,
			query: q,
			limits: { colorado: colorado.length, america: america.length, worldwide: worldwide.length },
		};
	}
}

function subtitleForWorldRiver(r: any): string {
	const parts: string[] = [];
	if (r.difficulty) parts.push(r.difficulty);
	if (r.region) parts.push(`${r.region}, ${r.country}`);
	else parts.push(r.country);
	return parts.join(' · ');
}
