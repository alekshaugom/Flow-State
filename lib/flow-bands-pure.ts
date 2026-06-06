// Pure FlowBand helpers — no Harper runtime dependency. Imported by tests
// and by flow-bands.ts (which adds the harper-backed loader/resolver).
import { getFlowStatus } from './utils.ts';

export function bandToDesignStatus(bandName: string): string {
	switch (bandName) {
		case 'too-low': return 'too-low';
		case 'low-runnable': return 'runnable';
		case 'technical': return 'runnable';
		case 'ideal': return 'ideal';
		case 'pushy': return 'high';
		case 'expert-only': return 'expert-only';
		case 'unsafe': return 'dangerous';
		default: return bandName;
	}
}

export function bandToLabel(bandName: string): string {
	switch (bandName) {
		case 'too-low': return 'Too Low';
		case 'low-runnable': return 'Runnable (technical)';
		case 'technical': return 'Runnable';
		case 'ideal': return 'Good';
		case 'pushy': return 'Pushy';
		case 'expert-only': return 'Expert Only';
		case 'unsafe': return 'Dangerous';
		default: return bandName;
	}
}

export interface ResolvedBand {
	bandName: string;
	rating: string;
	description: string;
	authorNote: string | null;
	minCfs: number | null;
	maxCfs: number | null;
	source: string;
	craftType: string | null;
	skillLevel: string | null;
}

export interface FlowBandRow {
	id: string;
	sectionId: string;
	craftType: string | null;
	commercial: boolean | null;
	skillLevel: string | null;
	bandName: string;
	minCfs: number;
	maxCfs: number;
	rating: string;
	description: string;
	authorNote: string | null;
	source: string;
	active: boolean;
}

const LEGACY_DESCRIPTIONS: Record<string, { rating: string; description: string }> = {
	'no-flow':     { rating: 'no-go',       description: 'The river is dry or near-zero at this section. Nothing to run — check back when flows return, or pick a different watershed.' },
	'too-low':     { rating: 'no-go',       description: 'Below the runnable threshold for most craft and skill levels. Expect frequent boat-stoppers, exposed rocks, and pinning risk. Wait for more water or try an easier section nearby.' },
	'low':         { rating: 'marginal',    description: 'Below the ideal range but still technically runnable for experienced crews. Expect scraping, slower lines, and more maneuvering than at peak flows. Not the day for beginners or commercial groups.' },
	'runnable':    { rating: 'good',        description: 'Open for trips, sitting on the lower or shoulder end of ideal. Lines are clean, features are manageable, and most experienced crews will have a solid day. Beginners can go with a strong leader.' },
	'ideal':       { rating: 'ideal',       description: 'In the sweet spot — this is the best the section runs all season. Features are dialed, lines are clean, and there is plenty of room for fun without overwhelming consequence.' },
	'high':        { rating: 'challenging', description: 'Pushy water with fewer eddies and longer swims. Experienced crews and bigger boats are preferred — smaller setups should size up or wait. Skip if you are not confident in your roster and recoveries.' },
	'expert-only': { rating: 'challenging', description: 'Expert paddlers only. Few eddies, hard-to-catch features, and big consequences for missed lines or swims. Should only be run by crews who already know the section at this level.' },
	'dangerous':   { rating: 'dangerous',   description: 'Closed by most outfitters and unsafe for nearly all private boaters. Significant risk of injury or worse. Wait for the river to come back into range — this is not a day to run it.' },
};

export function pickBandsForValue(bands: FlowBandRow[], value: number): FlowBandRow[] {
	return bands
		.filter(b => b.active !== false)
		.filter(b => value >= b.minCfs && value <= b.maxCfs);
}

export function selectByPrecedence(
	matching: FlowBandRow[],
	craft: string,
	skill: string,
): FlowBandRow | null {
	const exact = matching.find(b => b.craftType === craft && b.skillLevel === skill);
	if (exact) return exact;
	const craftOnly = matching.find(b => b.craftType === craft && !b.skillLevel);
	if (craftOnly) return craftOnly;
	const skillOnly = matching.find(b => !b.craftType && b.skillLevel === skill);
	if (skillOnly) return skillOnly;
	const generic = matching.find(b => !b.craftType && !b.skillLevel);
	if (generic) return generic;
	return null;
}

export function rowToResolved(row: FlowBandRow): ResolvedBand {
	return {
		bandName: row.bandName,
		rating: row.rating,
		description: row.description,
		authorNote: row.authorNote || null,
		minCfs: row.minCfs,
		maxCfs: row.maxCfs,
		source: row.source,
		craftType: row.craftType,
		skillLevel: row.skillLevel,
	};
}

export function legacyFallback(section: any, value: number): ResolvedBand | null {
	if (value == null) return null;
	const status = getFlowStatus(value, {
		low: section.flowLow,
		runnable: section.flowRunnable,
		idealMin: section.flowIdealMin,
		idealMax: section.flowIdealMax,
		high: section.flowHigh,
		expert: section.flowExpert,
		dangerous: section.flowDangerous,
	});
	const meta = LEGACY_DESCRIPTIONS[status] || LEGACY_DESCRIPTIONS['runnable'];
	return {
		bandName: status,
		rating: meta.rating,
		description: meta.description,
		authorNote: null,
		minCfs: null,
		maxCfs: null,
		source: 'legacy-fallback',
		craftType: null,
		skillLevel: null,
	};
}

export function resolveFromCache(
	bands: FlowBandRow[],
	section: any,
	craft: string,
	skill: string,
	value: number | null,
): ResolvedBand | null {
	if (value == null) return null;
	const matching = pickBandsForValue(bands, value);
	const picked = selectByPrecedence(matching, craft, skill);
	if (picked) return rowToResolved(picked);
	return legacyFallback(section, value);
}
