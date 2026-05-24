import { fetchCached } from './cache';
import { fetchReachCoords } from './aw-detail';
import type { PartialRiver } from './types';

const RIVER_INDEX_URL = 'https://www.americanwhitewater.org/content/River/view/river-index';

// AW uses 3-letter state slugs in its data ("USA-COL" for Colorado).
const AW_STATE_TO_REGION: Record<string, string> = {
	'USA-ALA': 'Alabama', 'USA-ALK': 'Alaska', 'USA-ARZ': 'Arizona', 'USA-ARK': 'Arkansas',
	'USA-CAL': 'California', 'USA-COL': 'Colorado', 'USA-CON': 'Connecticut', 'USA-DEL': 'Delaware',
	'USA-DCO': 'District of Columbia', 'USA-FLA': 'Florida', 'USA-GEO': 'Georgia', 'USA-HAW': 'Hawaii',
	'USA-IDA': 'Idaho', 'USA-ILL': 'Illinois', 'USA-IND': 'Indiana', 'USA-IOW': 'Iowa',
	'USA-KAN': 'Kansas', 'USA-KEN': 'Kentucky', 'USA-LOU': 'Louisiana', 'USA-MAI': 'Maine',
	'USA-MRY': 'Maryland', 'USA-MAS': 'Massachusetts', 'USA-MIC': 'Michigan', 'USA-MIN': 'Minnesota',
	'USA-MIS': 'Mississippi', 'USA-MSR': 'Missouri', 'USA-MON': 'Montana', 'USA-NEB': 'Nebraska',
	'USA-NEV': 'Nevada', 'USA-NHA': 'New Hampshire', 'USA-NJE': 'New Jersey', 'USA-NME': 'New Mexico',
	'USA-NYO': 'New York', 'USA-NCA': 'North Carolina', 'USA-NDA': 'North Dakota', 'USA-OHI': 'Ohio',
	'USA-OKL': 'Oklahoma', 'USA-ORE': 'Oregon', 'USA-PEN': 'Pennsylvania', 'USA-RHI': 'Rhode Island',
	'USA-SCR': 'South Carolina', 'USA-SDA': 'South Dakota', 'USA-TNN': 'Tennessee', 'USA-TEX': 'Texas',
	'USA-UTH': 'Utah', 'USA-VER': 'Vermont', 'USA-VRG': 'Virginia', 'USA-WSH': 'Washington',
	'USA-WVR': 'West Virginia', 'USA-WIS': 'Wisconsin', 'USA-WYO': 'Wyoming',
};

interface ReachStub {
	id: string;
	section: string;
	altname: string;
	river: string;
	difficulty: string;
	states: string[];
}

// AW encodes difficulty like "IItoIIIstandoutIV" or "Vplus". Convert to "Class III-IV+".
function parseDifficulty(d: string): string {
	if (!d) return '';
	const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
	// Replace "plus" → "+"
	let s = d.replace(/plus/gi, '+');
	// "standout" splits into base + harder rapid; we keep both as a range "X-Y"
	s = s.replace(/standout/gi, 'to');
	// "to" between roman numerals becomes "-"
	const tokens = s.split(/to/i).map(t => t.trim()).filter(Boolean);
	const valid = tokens.filter(t => ROMAN.some(r => t.startsWith(r)));
	if (valid.length === 0) return '';
	if (valid.length === 1) return `Class ${valid[0]}`;
	return `Class ${valid[0]}-${valid[valid.length - 1]}`;
}

function decodeNextPushText(html: string): string {
	// Each push payload is a JS string literal; the raw bytes between the quotes
	// use JS escapes (\" \\ \n etc.). Re-wrap in quotes and JSON.parse to decode
	// — JSON's string grammar is a subset of JS's, sufficient for what Next emits.
	const matches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
	let combined = '';
	for (const m of matches) {
		try {
			combined += JSON.parse('"' + m[1] + '"');
		} catch {
			// Skip any malformed payload.
		}
	}
	return combined;
}

function extractReachStubs(decoded: string): ReachStub[] {
	const key = '"reachStubs":';
	const start = decoded.indexOf(key);
	if (start < 0) return [];
	// Find the opening bracket and parse a balanced JSON array.
	const arrayStart = decoded.indexOf('[', start);
	if (arrayStart < 0) return [];
	let depth = 0;
	let end = -1;
	for (let i = arrayStart; i < decoded.length; i++) {
		const ch = decoded[i];
		if (ch === '[') depth++;
		else if (ch === ']') {
			depth--;
			if (depth === 0) { end = i + 1; break; }
		}
	}
	if (end < 0) return [];
	const slice = decoded.slice(arrayStart, end);
	try {
		return JSON.parse(slice);
	} catch (err) {
		console.warn('[aw] could not JSON-parse reachStubs:', (err as Error).message);
		return [];
	}
}

export async function fetchAmericanWhitewaterRivers(): Promise<PartialRiver[]> {
	console.log('[aw] fetching river index...');
	const html = await fetchCached(RIVER_INDEX_URL, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; FlowStatePipeline/1.0)',
			'Accept': 'text/html,application/xhtml+xml',
		},
	}, 'aw-index');
	const decoded = decodeNextPushText(html);
	const stubs = extractReachStubs(decoded);
	console.log(`[aw] extracted ${stubs.length} reachStubs`);

	// Fetch per-reach coordinates from detail pages (cached, bulk concurrent).
	const reachIds = stubs.map(s => s.id).filter(Boolean);
	const coordsByReach = await fetchReachCoords(reachIds);

	const out: PartialRiver[] = [];
	for (const s of stubs) {
		const name = (s.river || '').trim();
		if (!name || name === 'xx' || name.length < 2) continue;
		// Only US reaches keep clean continent + iso mapping; AW also has some
		// non-US data with non-USA state codes that we skip.
		const usState = s.states?.find(st => st.startsWith('USA-'));
		if (!usState) continue;
		const region = AW_STATE_TO_REGION[usState] || null;
		const section = (s.section || '').trim();
		const altname = (s.altname || '').trim();
		const difficulty = parseDifficulty(s.difficulty);
		// Encode altname inline with the section (AW's altname is a section-local
		// alias, not an alternate river name).
		const sectionLabel = section && altname && altname !== section
			? `${section} (${altname})`
			: (section || altname);
		const noteBits: string[] = [];
		if (difficulty) noteBits.push(difficulty);
		if (sectionLabel) noteBits.push(sectionLabel);
		const note = `${noteBits.join(' · ')}. Documented on American Whitewater. Live flow data not yet tracked.`;

		const coords = coordsByReach.get(s.id);
		out.push({
			name,
			alternate_names: [],
			country: 'United States',
			iso_country: 'US',
			continent: 'North America',
			region,
			source_lat: coords?.put_in_lat ?? null,
			source_lon: coords?.put_in_lon ?? null,
			mouth_lat: coords?.take_out_lat ?? null,
			mouth_lon: coords?.take_out_lon ?? null,
			center_lat: coords?.center_lat ?? null,
			center_lon: coords?.center_lon ?? null,
			difficulty: difficulty || null,
			sections: sectionLabel,
			note,
			learn_more_url: `https://www.americanwhitewater.org/content/River/detail/id/${s.id}/`,
			wikidata_id: null,
			source: 'american-whitewater',
		});
	}
	console.log(`[aw] kept ${out.length} US reaches`);
	return out;
}
