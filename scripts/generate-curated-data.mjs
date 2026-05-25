// Reads scripts/access-points-draft.json and emits lib/curated-river-data.ts —
// the typed source-of-truth for hand-curated AccessPoints, ImpassablePoints,
// gauge overrides, and section→AP leg mappings. Re-run after edits to the JSON.
//
// Usage: node scripts/generate-curated-data.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const JSON_PATH = '/Users/aleks/Flow-State/scripts/access-points-draft.json';
const TS_PATH = '/Users/aleks/Flow-State/lib/curated-river-data.ts';

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

function slugify(s) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Colorado mainstem has 4 corridors — split each AP and gauge to its corridor.
const COLORADO_AP_CORRIDORS = {
	'Confluence River Access (Kremmling)': 'upper-colorado',
	'Pumphouse Recreation Site': 'upper-colorado',
	'Radium Recreation Site': 'upper-colorado',
	'Mugrage Campground': 'upper-colorado',
	'Rancho Del Rio': 'upper-colorado',
	'State Bridge Recreation Site': 'upper-colorado',
	'Two Bridges': 'upper-colorado',
	'Catamount Bridge Boat Launch': 'upper-colorado',
	'Pinball Access': 'upper-colorado',
	'Lyons Gulch Boat Launch': 'upper-colorado',
	'Dotsero Landing': 'upper-colorado',
	'Shoshone Power Plant Put-in': 'glenwood-canyon',
	'Grizzly Creek Rest Area': 'glenwood-canyon',
	'No Name Rest Area': 'glenwood-canyon',
	'Two Rivers Park': 'glenwood-canyon',
	'South Canyon River Access': 'grand-valley',
	'New Castle Boat Ramp': 'grand-valley',
	'Silt Boat Ramp': 'grand-valley',
	'Rifle Boat Ramp': 'grand-valley',
	'Cameo Boat Ramp': 'grand-valley',
	'Riverbend Park (Palisade)': 'grand-valley',
	'Corn Lake (James M. Robb State Park)': 'grand-valley',
	'Loma Boat Launch': 'ruby-horsethief',
	'Westwater Ranger Station (UT)': 'ruby-horsethief',
};

const COLORADO_GAUGE_CORRIDORS = {
	'usgs-09034500': 'upper-colorado',
	'usgs-09058000': 'upper-colorado',
	'usgs-09060799': 'upper-colorado',
	'usgs-09070500': 'upper-colorado',
	'usgs-09085100': 'glenwood-canyon',
	'usgs-09095500': 'grand-valley',
	'usgs-09163500': 'ruby-horsethief',
};

const COLORADO_DAM_CORRIDORS = {
	'Granby Dam': { upstream: null, downstream: 'upper-colorado' },
	'Shoshone Diversion Dam': { upstream: 'upper-colorado', downstream: 'glenwood-canyon' },
};

// Dam corridor mappings for other multi-corridor rivers.
const DAM_CORRIDORS = {
	'Pueblo Dam': { riverId: 'arkansas', upstream: 'arkansas-headwaters', downstream: null },
	'Dillon Dam': { riverId: 'blue', upstream: null, downstream: 'blue-corridor' },
	'Green Mountain Dam': { riverId: 'blue', upstream: 'blue-corridor', downstream: 'blue-corridor' },
	'Blue Mesa Dam': { riverId: 'gunnison', upstream: 'gunnison-headwaters', downstream: 'gunnison-gorge-corridor' },
	'Morrow Point Dam': { riverId: 'gunnison', upstream: 'gunnison-gorge-corridor', downstream: 'gunnison-gorge-corridor' },
	'Crystal Dam': { riverId: 'gunnison', upstream: 'gunnison-gorge-corridor', downstream: 'gunnison-gorge-corridor' },
	'McPhee Dam': { riverId: 'dolores', upstream: null, downstream: 'dolores-canyon' },
	'Navajo Dam': { riverId: 'san-juan', upstream: 'san-juan-corridor', downstream: null },
	'Coors / Golden Diversion Dam': { riverId: 'clear-creek', upstream: 'clear-creek-canyon', downstream: 'clear-creek-canyon' },
	'Cheesman Dam': { riverId: 'south-platte', upstream: null, downstream: 'south-platte-corridor' },
	'Strontia Springs Dam': { riverId: 'south-platte', upstream: 'south-platte-corridor', downstream: 'south-platte-corridor' },
	'Chatfield Dam': { riverId: 'south-platte', upstream: 'south-platte-corridor', downstream: 'south-platte-corridor' },
};

// Section → (fromAP, toAP) mapping. The section.putIn/takeOut strings in
// lib/seed-data.ts conflate multiple AHRA access points; this map resolves
// each named section to the most representative pair of curated APs.
const SECTION_LEGS = {
	// Arkansas
	'arkansas-numbers': { fromAP: 'Granite', toAP: 'Railroad Bridge' },
	'arkansas-fractions': { fromAP: 'Buena Vista Whitewater Park', toAP: "Fisherman's Bridge (Browns top)" },
	'arkansas-browns-canyon': { fromAP: 'Ruby Mountain', toAP: 'Stone Bridge' },
	'arkansas-bighorn-sheep': { fromAP: 'Cotopaxi', toAP: 'Parkdale' },
	'arkansas-royal-gorge': { fromAP: 'Parkdale', toAP: 'Centennial Park' },
	// Colorado
	'colorado-gore-canyon': { fromAP: 'Confluence River Access (Kremmling)', toAP: 'Pumphouse Recreation Site' },
	'colorado-pumphouse': { fromAP: 'Pumphouse Recreation Site', toAP: 'State Bridge Recreation Site' },
	'colorado-shoshone': { fromAP: 'Shoshone Power Plant Put-in', toAP: 'Two Rivers Park' },
	'colorado-south-canyon': { fromAP: 'South Canyon River Access', toAP: 'New Castle Boat Ramp' },
	'colorado-cameo-to-palisade': { fromAP: 'Cameo Boat Ramp', toAP: 'Riverbend Park (Palisade)' },
	'colorado-ruby-horsethief': { fromAP: 'Loma Boat Launch', toAP: 'Westwater Ranger Station (UT)' },
	// Gunnison
	'gunnison-upper-almont': { fromAP: 'Almont (East + Taylor confluence)', toAP: 'Town of Gunnison (US-50 access)' },
	'gunnison-gorge': { fromAP: 'Chukar Trail', toAP: 'Gunnison Forks / Pleasure Park' },
	'gunnison-whitewater': { fromAP: 'Whitewater Boat Ramp', toAP: 'Las Colonias Park (Grand Junction)' },
	'taylor-river-below-dam': { fromAP: 'Taylor Park Dam (tailwater)', toAP: 'Almont (East + Taylor confluence)' },
	// Clear Creek
	'clear-creek-upper': { fromAP: 'Two Bears (Kermits)', toAP: 'Clear Creek Open Space (Kermits Take-Out)' },
	'clear-creek-lower': { fromAP: 'Tunnel 1 (above)', toAP: 'Vanover Park' },
	// Poudre
	'poudre-upper-narrows': { fromAP: 'Lower Narrows Campground Put-In', toAP: 'Stevens Gulch Picnic Area' },
	'poudre-lower-canyon': { fromAP: 'Filter Plant Put-In', toAP: 'Picnic Rock' },
	// Animas
	'animas-upper-silverton': { fromAP: 'Silverton (Mineral Creek)', toAP: 'Rockwood Depot' },
	'animas-durango': { fromAP: 'Bakers Bridge', toAP: 'Dallabetta Park' },
	// Dolores
	'dolores-slick-rock': { fromAP: 'Bradfield Bridge', toAP: 'Bedrock' },
	'dolores-gateway': { fromAP: 'Bedrock', toAP: 'Gateway' },
	// San Miguel
	'san-miguel-norwood': { fromAP: 'Norwood Bridge', toAP: 'Naturita' },
	// Eagle
	'eagle-main': { fromAP: 'Minturn Boat Access', toAP: 'Dowd Junction (Eagle-Vail)' },
	'eagle-lower': { fromAP: 'Eagle River Park', toAP: 'Eagle-Colorado Confluence (Dotsero)' },
	// Roaring Fork
	'roaring-fork-slaughterhouse': { fromAP: 'Upper Woody Creek Bridge', toAP: 'Henry Stein Park (Slaughterhouse Bridge)' },
	'roaring-fork-lower': { fromAP: 'Hooks Bridge', toAP: 'Two Rivers Park (Glenwood Springs RF take-out)' },
	// Yampa
	'yampa-cross-mountain': { fromAP: 'East Cross Mountain (Cross Mountain Gorge put-in)', toAP: 'West Cross Mountain (Cross Mountain Gorge take-out)' },
	'yampa-dinosaur': { fromAP: 'Deerlodge Park', toAP: 'Split Mountain Boat Ramp' },
	// Blue
	'blue-below-dillon': { fromAP: 'Blue River Campground Put-in (below Dillon Dam)', toAP: 'Columbine Landing' },
	// Piedra
	'piedra-lower-box': { fromAP: 'First Fork Bridge', toAP: 'Lower Piedra Box take-out' },
	// San Juan
	'san-juan-pagosa': { fromAP: 'Pagosa Springs Town / Yamaguchi Park', toAP: 'Trujillo Road take-out' },
	// North Platte
	'north-platte-northgate': { fromAP: 'Routt Access', toAP: 'Six Mile Gap (WY)' },
	// South Platte
	'south-platte-deckers': { fromAP: 'Deckers', toAP: 'South Platte (Foxton confluence)' },
	'south-platte-waterton': { fromAP: 'Strontia Springs Dam outflow', toAP: 'Waterton Canyon Trailhead' },
};

const aps = [];
const dams = [];
const gauges = [];
const apNameById = new Map(); // (corridorId, apName) → apId

for (const [riverId, rd] of Object.entries(data.rivers)) {
	const corridorIds = rd.corridorIds || [];
	const defaultCorridor = corridorIds[0];

	for (let i = 0; i < (rd.accessPoints || []).length; i++) {
		const raw = rd.accessPoints[i];
		let corridorId = defaultCorridor;
		if (riverId === 'colorado') {
			corridorId = COLORADO_AP_CORRIDORS[raw.name] || defaultCorridor;
		}
		const id = `ap_${corridorId}_${slugify(raw.name)}`;
		const sortIndex = (i + 1) * 10;
		aps.push({
			id, corridorId, riverId,
			name: raw.name,
			altNames: (raw.altNames || []).join(','),
			kind: raw.kind,
			sortIndex,
			latitude: raw.latitude ?? null,
			longitude: raw.longitude ?? null,
			riverMile: raw.riverMile ?? null,
			fee: raw.fee ?? null,
			vehicleAccess: raw.vehicleAccess ?? null,
			notes: raw.notes || '',
		});
		apNameById.set(`${corridorId}::${raw.name}`, id);
		// Also index by altName
		for (const alt of (raw.altNames || [])) {
			apNameById.set(`${corridorId}::${alt}`, id);
		}
	}

	for (const raw of rd.impassableDams || []) {
		const mapping = riverId === 'colorado' ? COLORADO_DAM_CORRIDORS[raw.name] : DAM_CORRIDORS[raw.name];
		if (!mapping) {
			console.warn(`No corridor mapping for dam: ${raw.name} (river=${riverId})`);
			continue;
		}
		dams.push({
			id: `dam_${slugify(raw.name)}`,
			riverId,
			upstreamCorridorId: mapping.upstream ?? null,
			downstreamCorridorId: mapping.downstream ?? null,
			name: raw.name,
			kind: 'impassable-dam',
			latitude: raw.latitude ?? null,
			longitude: raw.longitude ?? null,
			riverMile: raw.riverMile ?? null,
			notes: raw.notes || '',
		});
	}

	for (const raw of rd.gauges || []) {
		let corridorId = defaultCorridor;
		if (riverId === 'colorado') {
			corridorId = COLORADO_GAUGE_CORRIDORS[raw.id] || defaultCorridor;
		}
		gauges.push({
			id: raw.id,
			name: raw.name,
			source: raw.id.split('-')[0],
			sourceId: raw.id.replace(/^usgs-/, ''),
			riverId,
			corridorId,
			latitude: raw.latitude ?? null,
			longitude: raw.longitude ?? null,
			riverMile: raw.riverMile ?? null,
			parameter: 'discharge',
			unit: 'cfs',
			url: `https://waterdata.usgs.gov/nwis/uv?site_no=${raw.id.replace(/^usgs-/, '')}`,
			active: true,
			notes: raw.notes || '',
		});
	}
}

// Resolve section→AP IDs by looking up the canonical AP name
const sectionLegs = {};
for (const [sectionId, leg] of Object.entries(SECTION_LEGS)) {
	const ap = aps.find(a => a.name === leg.fromAP || (a.altNames || '').split(',').includes(leg.fromAP));
	const apTo = aps.find(a => a.name === leg.toAP || (a.altNames || '').split(',').includes(leg.toAP));
	if (!ap) console.warn(`Section ${sectionId}: no AP found for fromAP="${leg.fromAP}"`);
	if (!apTo) console.warn(`Section ${sectionId}: no AP found for toAP="${leg.toAP}"`);
	sectionLegs[sectionId] = {
		fromAccessPointId: ap?.id ?? null,
		toAccessPointId: apTo?.id ?? null,
	};
}

// Position gauges by sortIndex within their corridor — interpolate between
// neighboring APs based on latitude if possible, else use even spacing.
for (const g of gauges) {
	if (g.latitude == null) {
		g.sortIndex = 999;
		continue;
	}
	const corridorAPs = aps.filter(a => a.corridorId === g.corridorId && a.latitude != null);
	if (corridorAPs.length === 0) {
		g.sortIndex = 999;
		continue;
	}
	// Find closest AP by latitude (proxy for upstream/downstream on N→S-flowing rivers)
	// All Colorado rivers flow generally W/S/SW so smaller longitude (more negative) is downstream
	// for E→W flowing rivers; for the Arkansas (W→E) it's larger longitude downstream.
	// Simplest: order APs by their existing sortIndex (which already encodes upstream→downstream),
	// then place the gauge between the two APs whose lat/lon bracket the gauge's lat/lon by distance.
	corridorAPs.sort((a, b) => a.sortIndex - b.sortIndex);
	let bestIdx = 0;
	let bestDist = Infinity;
	for (let i = 0; i < corridorAPs.length; i++) {
		const ap = corridorAPs[i];
		const d = Math.hypot(ap.latitude - g.latitude, (ap.longitude || 0) - (g.longitude || 0));
		if (d < bestDist) { bestDist = d; bestIdx = i; }
	}
	// Place the gauge at sortIndex slightly above its closest AP (so it appears just after that AP in upstream→downstream order)
	const anchor = corridorAPs[bestIdx];
	const next = corridorAPs[bestIdx + 1];
	g.sortIndex = next ? Math.floor((anchor.sortIndex + next.sortIndex) / 2) : anchor.sortIndex + 5;
}

// Emit TS
const ts = `// Auto-generated from scripts/access-points-draft.json by scripts/generate-curated-data.mjs
// Do not edit by hand — re-run the generator after editing the JSON.

export interface CuratedAccessPoint {
	id: string;
	corridorId: string;
	riverId: string;
	name: string;
	altNames: string;
	kind: 'put-in' | 'take-out' | 'both' | string;
	sortIndex: number;
	latitude: number | null;
	longitude: number | null;
	riverMile: number | null;
	fee: string | null;
	vehicleAccess: boolean | null;
	notes: string;
}

export interface CuratedImpassablePoint {
	id: string;
	riverId: string;
	upstreamCorridorId: string | null;
	downstreamCorridorId: string | null;
	name: string;
	kind: string;
	latitude: number | null;
	longitude: number | null;
	riverMile: number | null;
	notes: string;
}

export interface CuratedGauge {
	id: string;
	name: string;
	source: string;
	sourceId: string;
	riverId: string;
	corridorId: string | null;
	latitude: number | null;
	longitude: number | null;
	riverMile: number | null;
	parameter: string;
	unit: string;
	url: string;
	active: boolean;
	sortIndex?: number;
	notes: string;
}

export interface SectionLeg {
	fromAccessPointId: string | null;
	toAccessPointId: string | null;
}

export const CURATED_ACCESS_POINTS: CuratedAccessPoint[] = ${JSON.stringify(aps, null, '\t')};

export const CURATED_IMPASSABLE_POINTS: CuratedImpassablePoint[] = ${JSON.stringify(dams, null, '\t')};

export const CURATED_GAUGES: CuratedGauge[] = ${JSON.stringify(gauges, null, '\t')};

export const SECTION_LEG_MAPPING: Record<string, SectionLeg> = ${JSON.stringify(sectionLegs, null, '\t')};
`;

writeFileSync(TS_PATH, ts);
console.log(`Wrote ${aps.length} APs, ${dams.length} dams, ${gauges.length} gauges, ${Object.keys(sectionLegs).length} section legs to ${TS_PATH}`);
