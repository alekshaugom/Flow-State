import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WorldRiverJson {
	id: string;
	name: string;
	alternate_names: string[];
	country: string;
	iso_country: string;
	region: string | null;
	continent: string;
	source_lat: number | null;
	source_lon: number | null;
	mouth_lat: number | null;
	mouth_lon: number | null;
	center_lat: number | null;
	center_lon: number | null;
	difficulty: string | null;
	sections: string;
	note: string;
	learn_more_url: string;
	wikidata_id: string | null;
	has_flow_data: false;
	source: string;
}

export interface WorldRiverRow {
	id: string;
	name: string;
	nameLower: string;
	alternateNamesJson: string;
	country: string;
	isoCountry: string;
	region: string | null;
	continent: string;
	sourceLat: number | null;
	sourceLon: number | null;
	mouthLat: number | null;
	mouthLon: number | null;
	centerLat: number | null;
	centerLon: number | null;
	difficulty: string | null;
	sections: string;
	note: string;
	learnMoreUrl: string;
	wikidataId: string | null;
	hasFlowData: false;
	source: string;
}

let cached: WorldRiverRow[] | null = null;

export function loadWorldRivers(): WorldRiverRow[] {
	if (cached) return cached;
	const file = join(process.cwd(), 'data', 'rivers.json');
	if (!existsSync(file)) {
		console.warn(`[world-rivers] ${file} missing — search will only cover Colorado data`);
		cached = [];
		return cached;
	}
	const raw = readFileSync(file, 'utf-8');
	const arr = JSON.parse(raw) as WorldRiverJson[];
	cached = arr.map(toRow);
	console.log(`[world-rivers] loaded ${cached.length} entries from rivers.json`);
	return cached;
}

function toRow(r: WorldRiverJson): WorldRiverRow {
	return {
		id: r.id,
		name: r.name,
		nameLower: r.name.toLowerCase(),
		alternateNamesJson: JSON.stringify(r.alternate_names || []),
		country: r.country,
		isoCountry: r.iso_country,
		region: r.region ?? null,
		continent: r.continent,
		sourceLat: r.source_lat ?? null,
		sourceLon: r.source_lon ?? null,
		mouthLat: r.mouth_lat ?? null,
		mouthLon: r.mouth_lon ?? null,
		centerLat: r.center_lat ?? null,
		centerLon: r.center_lon ?? null,
		difficulty: r.difficulty ?? null,
		sections: r.sections || '',
		note: r.note || '',
		learnMoreUrl: r.learn_more_url || '',
		wikidataId: r.wikidata_id ?? null,
		hasFlowData: false,
		source: r.source,
	};
}
