export const VALID_CRAFT_TYPES = ['raft', 'paddle-raft', 'kayak'] as const;
export type CraftType = typeof VALID_CRAFT_TYPES[number];

export const USER_CRAFT_WRITABLE_FIELDS = ['name', 'craftType', 'craftSize', 'notes', 'isDefault'] as const;

export type CraftValidationError = { error: string; status: number } | null;

export function validateCraftType(t: any): CraftValidationError {
	if (t == null || t === '') return { error: 'craftType required', status: 400 };
	if (!(VALID_CRAFT_TYPES as readonly string[]).includes(t)) {
		return { error: `craftType must be one of: ${VALID_CRAFT_TYPES.join(', ')}`, status: 400 };
	}
	return null;
}

export function validateCraftName(n: any): CraftValidationError {
	if (n == null || typeof n !== 'string') return { error: 'name required', status: 400 };
	const trimmed = n.trim();
	if (!trimmed) return { error: 'name cannot be blank', status: 400 };
	if (trimmed.length > 80) return { error: 'name is too long (80 chars max)', status: 400 };
	return null;
}

export function pickUserCraftWritable(data: any): Record<string, any> {
	const out: Record<string, any> = {};
	if (!data || typeof data !== 'object') return out;
	for (const k of USER_CRAFT_WRITABLE_FIELDS) {
		if (data[k] !== undefined) out[k] = data[k];
	}
	if (typeof out.name === 'string') out.name = out.name.trim();
	return out;
}

export interface CraftRecord {
	id: string;
	isDefault?: boolean | null;
	archivedAt?: string | null;
}

/**
 * Given the full set of a user's crafts and a craft that's being marked default,
 * return the ids that must be unset (i.e. previously-default rows other than this one).
 * Pure — no DB access.
 */
export function applyDefaultPromotion(allCrafts: CraftRecord[], newDefaultId: string): { toUnset: string[] } {
	const toUnset: string[] = [];
	for (const c of allCrafts) {
		if (c.id === newDefaultId) continue;
		if (c.isDefault) toUnset.push(c.id);
	}
	return { toUnset };
}

/**
 * Find which craft should remain default after another one is archived.
 * If the archived craft was the default, the most-recently-updated active craft
 * becomes the new default. Returns null if no replacement exists.
 */
export function pickReplacementDefault(allCrafts: (CraftRecord & { updatedAt?: string })[], archivedId: string): string | null {
	const active = allCrafts.filter(c => c.id !== archivedId && !c.archivedAt);
	if (!active.length) return null;
	active.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
	return active[0]?.id || null;
}

export function denormalizeCraftToLog(craft: { name?: string | null; craftType?: string | null; craftSize?: string | null }): { craftName: string | null; craftType: string | null; craftSize: string | null } {
	return {
		craftName: craft.name || null,
		craftType: craft.craftType || null,
		craftSize: craft.craftSize || null,
	};
}
