// River-system hydrology for the curated Colorado dataset.
//
// Every corridor on the home page belongs to a Watershed (the "basin" /
// river system). Within a basin, one river is the main stem and the others
// are its tributaries. That main-stem ↔ tributary relationship is the one
// fact the dashboard payload does NOT carry, so we encode it here, keyed by
// the river *display name* exactly as it appears on DashboardSection.river
// (see lib/seed-data.ts RIVERS[].name).
//
// Note: this is a basin-relative classification. The Gunnison and Dolores are
// hydrologically Colorado tributaries, but each heads its own basin in this
// app's data model, so each is the main stem of its own box. Tributaries are
// only the rivers that share a watershed with a larger main stem here.
//
// To add a river: add its display name → main-stem display name below.
export const TRIBUTARY_OF: Record<string, string> = {
	// Upper Colorado / Eagle / Roaring Fork basin → Colorado main stem
	'Eagle River': 'Colorado River',
	'Roaring Fork River': 'Colorado River',
	'Blue River': 'Colorado River',
	// South Platte / Clear Creek / Cache la Poudre basin → South Platte main stem
	'Clear Creek': 'South Platte River',
	'Cache la Poudre River': 'South Platte River',
	// San Juan / Piedra basin → San Juan main stem
	'Animas River': 'San Juan River',
	'Piedra River': 'San Juan River',
	// Dolores / San Miguel basin → Dolores main stem
	'San Miguel River': 'Dolores River',
};

/** True if this river is a tributary of a larger main stem within its basin. */
export function isTributary(riverName: string | null | undefined): boolean {
	return !!riverName && riverName in TRIBUTARY_OF;
}

/** The main-stem river this river feeds into, or null if it is itself a main stem. */
export function mainStemOf(riverName: string | null | undefined): string | null {
	return riverName ? (TRIBUTARY_OF[riverName] ?? null) : null;
}

/** Strip the trailing " River" for compact labels: "Colorado River" → "Colorado". */
export function shortRiverName(riverName: string | null | undefined): string {
	return (riverName ?? '').replace(/\s+River$/, '');
}

// ── Basins (home-screen display grouping) ─────────────────────────────────────
//
// Maps each data-model watershed slug to the display "basin" it rolls up into.
// Naming formula: "{major river} Basin". Several watersheds can share one basin
// when they are forks of the same river — the South Platte and North Platte both
// roll into the Platte Basin. Distinct major rivers (Gunnison, Dolores, San Juan,
// Yampa, Arkansas) each stay their own basin; tributaries are marked via
// TRIBUTARY_OF, not merged. This is presentation-only — the underlying Watershed
// records (and /watershed pages) are unchanged.
export interface Basin {
	key: string;
	name: string;
}

const WATERSHED_TO_BASIN: Record<string, Basin> = {
	'colorado-headwaters': { key: 'colorado', name: 'Colorado Basin' },
	'gunnison': { key: 'gunnison', name: 'Gunnison Basin' },
	'arkansas': { key: 'arkansas', name: 'Arkansas Basin' },
	'south-platte': { key: 'platte', name: 'Platte Basin' },
	'north-platte': { key: 'platte', name: 'Platte Basin' },
	'yampa-green': { key: 'yampa', name: 'Yampa Basin' },
	'san-juan': { key: 'san-juan', name: 'San Juan Basin' },
	'dolores': { key: 'dolores', name: 'Dolores Basin' },
};

/** Resolve the display basin for a watershed slug, falling back to its raw name. */
export function basinFor(
	watershedSlug: string | null | undefined,
	watershedName: string | null | undefined,
): Basin {
	if (watershedSlug && WATERSHED_TO_BASIN[watershedSlug]) return WATERSHED_TO_BASIN[watershedSlug];
	return { key: watershedSlug ?? watershedName ?? 'other', name: watershedName ?? 'Other' };
}
