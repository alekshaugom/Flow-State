export type AccessState = 'accepted' | 'pending' | 'declined' | 'removed' | 'not-found';

export function canUserAccessTrip(participantRow: any): AccessState {
	if (!participantRow) return 'not-found';
	if (participantRow.removedAt) return 'removed';
	if (participantRow.declinedAt) return 'declined';
	if (!participantRow.acceptedAt) return 'pending';
	return 'accepted';
}

export const SELF_WRITABLE_FIELDS = [
	'notes', 'notesPrivate', 'craftSequenceJson', 'craftIds', 'acceptedAt', 'declinedAt',
] as const;

export const OTHER_WRITABLE_FIELDS = ['removedAt'] as const;

export type ParticipantPatchResult =
	| { ok: true; fields: Record<string, any> }
	| { ok: false; error: string; status: number };

export function validateParticipantPatch(data: any, isSelf: boolean): ParticipantPatchResult {
	if (!data || typeof data !== 'object') return { ok: false, error: 'patch body required', status: 400 };
	const allowed: readonly string[] = isSelf ? SELF_WRITABLE_FIELDS : OTHER_WRITABLE_FIELDS;
	const out: Record<string, any> = {};
	for (const key of Object.keys(data)) {
		if (key === 'id' || key === 'tripId' || key === 'userId' || key === 'addedBy' || key === 'invitedAt' || key === 'createdAt' || key === 'updatedAt') continue;
		if (!allowed.includes(key)) {
			return { ok: false, error: `field "${key}" cannot be patched by ${isSelf ? 'self' : 'other participant'}`, status: 403 };
		}
		out[key] = data[key];
	}
	return { ok: true, fields: out };
}

export interface CraftSequenceEntry {
	craftId: string | null;
	craftType: string | null;
	craftSize: string | null;
	craftName: string | null;
}

export function buildCraftSequence(
	craftIds: Array<string | null | undefined>,
	craftDetailsLookup: (id: string) => { craftType?: string; craftSize?: string; name?: string } | null,
): CraftSequenceEntry[] {
	const out: CraftSequenceEntry[] = [];
	for (const id of craftIds) {
		if (!id) {
			out.push({ craftId: null, craftType: null, craftSize: null, craftName: null });
			continue;
		}
		const details = craftDetailsLookup(id);
		out.push({
			craftId: id,
			craftType: details?.craftType ?? null,
			craftSize: details?.craftSize ?? null,
			craftName: details?.name ?? null,
		});
	}
	return out;
}

export function craftIdsFromSequence(seq: CraftSequenceEntry[]): string[] {
	const out: string[] = [];
	for (const e of seq) {
		if (e.craftId) out.push(e.craftId);
	}
	return out;
}

export function parseCraftSequence(json: string | null | undefined): CraftSequenceEntry[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((e: any) => e && typeof e === 'object')
			.map((e: any) => ({
				craftId: typeof e.craftId === 'string' ? e.craftId : null,
				craftType: typeof e.craftType === 'string' ? e.craftType : null,
				craftSize: typeof e.craftSize === 'string' ? e.craftSize : null,
				craftName: typeof e.craftName === 'string' ? e.craftName : null,
			}));
	} catch {
		return [];
	}
}

export function stringifyCraftSequence(seq: CraftSequenceEntry[]): string | null {
	if (!seq || seq.length === 0) return null;
	return JSON.stringify(seq);
}

export interface ParticipantView {
	userId: string;
	name: string | null;
	avatarUrl: string | null;
	notes: string | null;
	notesPrivate: boolean;
	craftSequenceJson: string | null;
	acceptedAt: string | null;
	isSelf: boolean;
}

/**
 * Build a participant view-model for client display. Honors `notesPrivate`:
 * other viewers see null notes, the participant themselves always sees their own.
 */
export function toParticipantView(
	row: any,
	user: { name?: string | null; avatarUrl?: string | null } | null,
	isSelf: boolean,
): ParticipantView {
	const notesPrivate = !!row?.notesPrivate;
	const notes = notesPrivate && !isSelf ? null : (row?.notes ?? '');
	return {
		userId: row?.userId,
		name: user?.name ?? null,
		avatarUrl: user?.avatarUrl ?? null,
		notes,
		notesPrivate,
		craftSequenceJson: row?.craftSequenceJson ?? null,
		acceptedAt: row?.acceptedAt ?? null,
		isSelf,
	};
}
