import type { DesignStatus } from '../constants';

export type CraftType = 'raft' | 'paddle-raft' | 'kayak';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';

export const CRAFTS: { id: CraftType; label: string; short: string }[] = [
	{ id: 'raft', label: 'Oar-Raft', short: 'Oar-Raft' },
	{ id: 'paddle-raft', label: 'Paddle Boat', short: 'Paddle Boat' },
	{ id: 'kayak', label: 'Kayak/SUP', short: 'Kayak/SUP' },
];

export const SKILLS: { id: SkillLevel; label: string }[] = [
	{ id: 'beginner', label: 'Beginner' },
	{ id: 'intermediate', label: 'Intermediate' },
	{ id: 'expert', label: 'Expert' },
];

export const CRAFT_STORAGE_KEY = 'flowstate.craft';
export const SKILL_STORAGE_KEY = 'flowstate.skill';

export function readStoredCraft(): CraftType {
	if (typeof window === 'undefined') return 'raft';
	const v = window.localStorage.getItem(CRAFT_STORAGE_KEY);
	if (v === 'raft' || v === 'paddle-raft' || v === 'kayak') return v;
	return 'raft';
}

export function readStoredSkill(): SkillLevel {
	if (typeof window === 'undefined') return 'intermediate';
	const v = window.localStorage.getItem(SKILL_STORAGE_KEY);
	if (v === 'beginner' || v === 'intermediate' || v === 'expert') return v;
	return 'intermediate';
}

export function writeStoredCraft(c: CraftType) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(CRAFT_STORAGE_KEY, c);
}

export function writeStoredSkill(s: SkillLevel) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(SKILL_STORAGE_KEY, s);
}

// === Band-name mapping (matches lib/flow-bands.ts) ===

export function bandToDesignStatus(bandName: string): DesignStatus {
	switch (bandName) {
		case 'too-low': return 'low';
		case 'low-runnable': return 'runnable';
		case 'technical': return 'runnable';
		case 'ideal': return 'ideal';
		case 'pushy': return 'high';
		case 'expert-only': return 'high';
		case 'unsafe': return 'dangerous';
		default: return 'low';
	}
}

export function bandToLabel(bandName: string): string {
	switch (bandName) {
		case 'too-low': return 'Too Low';
		case 'low-runnable': return 'Runnable (technical)';
		case 'technical': return 'Runnable';
		case 'ideal': return 'Ideal';
		case 'pushy': return 'Pushy';
		case 'expert-only': return 'Expert Only';
		case 'unsafe': return 'Dangerous';
		default: return bandName;
	}
}

// === Client-side resolver — mirrors lib/flow-bands.ts ===
// Used to update the band display when user toggles craft/skill without
// hitting the server again. All FlowBand rows for the section come down
// in the RiverDetail response.

export interface FlowBandRow {
	id: string;
	sectionId: string;
	craftType: CraftType | null;
	commercial: boolean | null;
	skillLevel: SkillLevel | null;
	bandName: string;
	minCfs: number;
	maxCfs: number;
	rating: string;
	description: string;
	authorNote: string | null;
	source: string;
	active: boolean;
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

export function resolveBandClient(
	bands: FlowBandRow[],
	craft: CraftType,
	skill: SkillLevel,
	value: number | null,
): ResolvedBand | null {
	if (value == null) return null;
	const matching = bands
		.filter(b => b.active !== false)
		.filter(b => value >= b.minCfs && value <= b.maxCfs);

	const exact = matching.find(b => b.craftType === craft && b.skillLevel === skill);
	if (exact) return rowToResolved(exact);
	const craftOnly = matching.find(b => b.craftType === craft && !b.skillLevel);
	if (craftOnly) return rowToResolved(craftOnly);
	const skillOnly = matching.find(b => !b.craftType && b.skillLevel === skill);
	if (skillOnly) return rowToResolved(skillOnly);
	const generic = matching.find(b => !b.craftType && !b.skillLevel);
	if (generic) return rowToResolved(generic);
	return null;
}

function rowToResolved(row: FlowBandRow): ResolvedBand {
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
