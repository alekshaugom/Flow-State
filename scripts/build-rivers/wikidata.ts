import { fetchCached } from './cache';
import { ISO_TO_CONTINENT } from './iso';
import type { PartialRiver } from './types';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Two-pass approach so each query stays fast:
// Pass 1: country QID → ISO 3166-1 alpha-2 (small lookup, ~250 rows)
// Pass 2: rivers with country QID (kept simple — was the original working query)

const QUERY_COUNTRIES = `
SELECT ?country ?countryLabel ?iso WHERE {
  ?country wdt:P31 wd:Q6256.
  ?country wdt:P297 ?iso.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`.trim();

const QUERY_LONG_RIVERS = `
SELECT DISTINCT ?river ?riverLabel ?country ?coords ?sourceCoords ?length WHERE {
  ?river wdt:P31 wd:Q4022.
  ?river wdt:P2043 ?length.
  FILTER(?length >= 100)
  OPTIONAL { ?river wdt:P17 ?country. }
  OPTIONAL { ?river wdt:P625 ?coords. }
  OPTIONAL { ?river wdt:P885 ?sourceItem. ?sourceItem wdt:P625 ?sourceCoords. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?length)
LIMIT 5000
`.trim();

const QUERY_PADDLING_RIVERS = `
SELECT DISTINCT ?river ?riverLabel ?country ?coords ?sourceCoords WHERE {
  ?river wdt:P31 wd:Q4022.
  { ?river wdt:P641 wd:Q47506. }
  UNION { ?river wdt:P641 wd:Q173799. }
  UNION { ?river wdt:P641 wd:Q1130299. }
  UNION { ?river wdt:P641 wd:Q1057051. }
  OPTIONAL { ?river wdt:P17 ?country. }
  OPTIONAL { ?river wdt:P625 ?coords. }
  OPTIONAL { ?river wdt:P885 ?sourceItem. ?sourceItem wdt:P625 ?sourceCoords. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 2000
`.trim();

interface WdResult {
	river?: { value: string };
	riverLabel?: { value: string };
	country?: { value: string };
	countryLabel?: { value: string };
	iso?: { value: string };
	coords?: { value: string };
	sourceCoords?: { value: string };
	length?: { value: string };
}

function parseCoords(point?: string): { lat: number | null; lon: number | null } {
	if (!point) return { lat: null, lon: null };
	const m = point.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
	if (!m) return { lat: null, lon: null };
	return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
}

function qidFromUri(uri: string): string {
	const m = uri.match(/Q\d+$/);
	return m ? m[0] : uri;
}

async function runQuery(query: string, label: string): Promise<WdResult[]> {
	const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
	const text = await fetchCached(url, { headers: { Accept: 'application/sparql-results+json' } }, `wd-${label}`);
	const data = JSON.parse(text);
	return data.results?.bindings || [];
}

export async function fetchWikidataRivers(): Promise<PartialRiver[]> {
	console.log('[wikidata] pass 1/2 — country → ISO map...');
	const countryRows = await runQuery(QUERY_COUNTRIES, 'countries-v3');
	const qidToIso = new Map<string, string>();
	const qidToName = new Map<string, string>();
	for (const r of countryRows) {
		if (!r.country?.value || !r.iso?.value) continue;
		const qid = qidFromUri(r.country.value);
		qidToIso.set(qid, r.iso.value.toUpperCase());
		if (r.countryLabel?.value) qidToName.set(qid, r.countryLabel.value);
	}
	console.log(`[wikidata] loaded ${qidToIso.size} country ISO codes`);

	console.log('[wikidata] pass 2/2 — rivers >= 100km...');
	const long = await runQuery(QUERY_LONG_RIVERS, 'long-v3');
	console.log(`[wikidata] long rivers: ${long.length}`);

	console.log('[wikidata] paddling-tagged rivers...');
	const paddling = await runQuery(QUERY_PADDLING_RIVERS, 'paddling-v3');
	console.log(`[wikidata] paddling-tagged: ${paddling.length}`);

	const out: PartialRiver[] = [];
	const seenQids = new Set<string>();

	for (const r of [...long, ...paddling]) {
		if (!r.river?.value) continue;
		const qid = qidFromUri(r.river.value);
		if (seenQids.has(qid)) continue;
		seenQids.add(qid);

		const name = r.riverLabel?.value;
		if (!name || /^Q\d+$/.test(name)) continue;

		const countryQid = r.country?.value ? qidFromUri(r.country.value) : null;
		const iso = countryQid ? qidToIso.get(countryQid) : null;
		if (!iso) continue;

		const country = (countryQid && qidToName.get(countryQid)) || iso;
		const continent = ISO_TO_CONTINENT[iso] || 'Other';
		const center = parseCoords(r.coords?.value);
		const src = parseCoords(r.sourceCoords?.value);

		out.push({
			name,
			country,
			iso_country: iso,
			continent,
			region: null,
			source_lat: src.lat,
			source_lon: src.lon,
			mouth_lat: null,
			mouth_lon: null,
			center_lat: center.lat,
			center_lon: center.lon,
			difficulty: null,
			sections: '',
			note: 'River documented on Wikidata. Live flow data not yet tracked.',
			learn_more_url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`,
			wikidata_id: qid,
			source: 'wikidata',
		});
	}

	console.log(`[wikidata] total unique rivers after ISO filter: ${out.length}`);
	return out;
}
