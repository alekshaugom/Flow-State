import type { PartialRiver, WorldRiverRecord, RiverSource } from './types';
import { ISO_TO_CONTINENT } from './iso';

const PRIORITY: Record<RiverSource, number> = {
	curated: 0,
	'american-whitewater': 1,
	wikidata: 2,
};

const NAME_PREFIXES = [
	/^river\s+/i,
	/^r[ií]o\s+/i,
	/^rivière\s+/i,
	/^fluss\s+/i,
];

function normalizeName(name: string): string {
	let n = name.trim().toLowerCase();
	for (const re of NAME_PREFIXES) n = n.replace(re, '');
	// Drop trailing common qualifiers we add ourselves, like " - Main"
	n = n.replace(/\s*[-—]\s*main$/i, '');
	// Strip section info in parens
	n = n.replace(/\s*\(.+\)\s*$/, '');
	// Collapse whitespace + strip accents
	n = n.normalize('NFD').replace(/[̀-ͯ]/g, '');
	n = n.replace(/\s+/g, ' ').trim();
	return n;
}

function slugify(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function truncateNote(note: string): string {
	if (note.length <= 260) return note;
	return note.slice(0, 257).trimEnd() + '…';
}

function mergeSectionStrings(a: string, b: string): string {
	const parts = new Set<string>();
	for (const s of (a || '').split(',').map(s => s.trim()).filter(Boolean)) parts.add(s);
	for (const s of (b || '').split(',').map(s => s.trim()).filter(Boolean)) parts.add(s);
	return Array.from(parts).join(', ');
}

function mergeRiver(primary: PartialRiver, secondary: PartialRiver): PartialRiver {
	const altNames = new Set<string>();
	for (const n of primary.alternate_names || []) altNames.add(n);
	for (const n of secondary.alternate_names || []) altNames.add(n);
	if (secondary.name && secondary.name !== primary.name) altNames.add(secondary.name);
	altNames.delete(primary.name);

	return {
		name: primary.name,
		alternate_names: Array.from(altNames).filter(Boolean),
		country: primary.country || secondary.country,
		iso_country: primary.iso_country || secondary.iso_country,
		region: primary.region ?? secondary.region ?? null,
		continent: primary.continent || secondary.continent || ISO_TO_CONTINENT[primary.iso_country],
		source_lat: primary.source_lat ?? secondary.source_lat ?? null,
		source_lon: primary.source_lon ?? secondary.source_lon ?? null,
		mouth_lat: primary.mouth_lat ?? secondary.mouth_lat ?? null,
		mouth_lon: primary.mouth_lon ?? secondary.mouth_lon ?? null,
		center_lat: primary.center_lat ?? secondary.center_lat ?? null,
		center_lon: primary.center_lon ?? secondary.center_lon ?? null,
		difficulty: primary.difficulty ?? secondary.difficulty ?? null,
		sections: mergeSectionStrings(primary.sections || '', secondary.sections || ''),
		note: primary.note || secondary.note || '',
		learn_more_url: primary.learn_more_url || secondary.learn_more_url || '',
		wikidata_id: primary.wikidata_id ?? secondary.wikidata_id ?? null,
		source: primary.source,
	};
}

export function dedupeAndFinalize(rivers: PartialRiver[]): WorldRiverRecord[] {
	const byKey = new Map<string, PartialRiver>();
	for (const r of rivers) {
		if (!r.name || !r.iso_country) continue;
		const key = `${normalizeName(r.name)}|${r.iso_country}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, r);
			continue;
		}
		// Lower priority number wins.
		const existingP = PRIORITY[existing.source];
		const newP = PRIORITY[r.source];
		const winner = newP < existingP ? r : existing;
		const loser = newP < existingP ? existing : r;
		byKey.set(key, mergeRiver(winner, loser));
	}

	// Assign slugs with disambiguation.
	const slugTaken = new Map<string, number>();
	const records: WorldRiverRecord[] = [];
	for (const r of byKey.values()) {
		const baseSlug = `${slugify(r.name)}-${r.iso_country.toLowerCase()}`;
		const usedTimes = slugTaken.get(baseSlug) || 0;
		const slug = usedTimes === 0 ? baseSlug : `${baseSlug}-${usedTimes + 1}`;
		slugTaken.set(baseSlug, usedTimes + 1);

		records.push({
			id: slug,
			name: r.name,
			alternate_names: r.alternate_names || [],
			country: r.country,
			iso_country: r.iso_country,
			region: r.region ?? null,
			continent: r.continent || ISO_TO_CONTINENT[r.iso_country] || 'Other',
			source_lat: r.source_lat ?? null,
			source_lon: r.source_lon ?? null,
			mouth_lat: r.mouth_lat ?? null,
			mouth_lon: r.mouth_lon ?? null,
			center_lat: r.center_lat ?? null,
			center_lon: r.center_lon ?? null,
			difficulty: r.difficulty ?? null,
			sections: r.sections || '',
			note: truncateNote(r.note || ''),
			learn_more_url: r.learn_more_url || '',
			wikidata_id: r.wikidata_id ?? null,
			has_flow_data: false,
			source: r.source,
		});
	}

	// Deterministic sort: continent → country → name.
	records.sort((a, b) => {
		if (a.continent !== b.continent) return a.continent.localeCompare(b.continent);
		if (a.country !== b.country) return a.country.localeCompare(b.country);
		return a.name.localeCompare(b.name);
	});

	return records;
}
