import { tripNightsBetween } from './multi-day-pure.ts';

export const WRITABLE_FIELDS = [
	'craftId',
	'craftType', 'craftSize', 'craftName', 'crewSize', 'durationHours',
	'putIn', 'takeOut', 'notes', 'conditionsTags', 'date',
	'endDate', 'campingJson',
] as const;

export function pickWritable(data: any): Record<string, any> {
	const out: Record<string, any> = {};
	if (!data || typeof data !== 'object') return out;
	for (const k of WRITABLE_FIELDS) {
		if (data[k] !== undefined) out[k] = data[k];
	}
	return out;
}

export type VisibilityError = { error: string; status: number } | null;

export function validateVisibility(visibility: any): VisibilityError {
	if (visibility === undefined || visibility === null || visibility === 'private') return null;
	return { error: 'Only visibility=private is allowed in this slice', status: 400 };
}

export function getDenormalizationIds(section: any, corridor: any): { watershedId: string | null; corridorId: string | null } {
	return {
		corridorId: section?.corridorId || null,
		watershedId: corridor?.watershedId || null,
	};
}

export type OwnershipCheck = 'ok' | 'not-found' | 'forbidden';

export function validateOwnership(record: any, currentUserId: string | null): OwnershipCheck {
	if (!record) return 'not-found';
	if (!currentUserId) return 'forbidden';
	if (record.userId !== currentUserId) return 'forbidden';
	return 'ok';
}

export interface BuildLogInput {
	userId: string;
	sectionId: string;
	date: string;
	endDate?: string | null;
	campingJson?: string | null;
	craftId?: string | null;
	craftType?: string | null;
	craftSize?: string | null;
	craftName?: string | null;
	crewSize?: number | null;
	durationHours?: number | null;
	putIn?: string | null;
	takeOut?: string | null;
	notes?: string | null;
	conditionsTags?: string | null;
}

export interface BuildLogContext {
	section: any;
	corridor: any;
	flow: { cfs: number; gaugeId: string } | null;
	id: string;
	now: string;
}

export function buildNewLogRow(input: BuildLogInput, ctx: BuildLogContext): any {
	const { watershedId, corridorId } = getDenormalizationIds(ctx.section, ctx.corridor);
	const tripNights = tripNightsBetween(input.date, input.endDate || null);
	return {
		id: ctx.id,
		userId: input.userId,
		sectionId: input.sectionId,
		watershedId,
		corridorId,
		date: input.date,
		endDate: input.endDate || null,
		campingJson: input.campingJson || null,
		tripNights,
		craftId: input.craftId || null,
		craftType: input.craftType || null,
		craftSize: input.craftSize || null,
		craftName: input.craftName || null,
		crewSize: typeof input.crewSize === 'number' ? input.crewSize : null,
		durationHours: typeof input.durationHours === 'number' ? input.durationHours : null,
		putIn: input.putIn || ctx.section?.putIn || null,
		takeOut: input.takeOut || ctx.section?.takeOut || null,
		notes: input.notes || null,
		conditionsTags: input.conditionsTags || null,
		flowAtTripCfs: ctx.flow?.cfs ?? null,
		flowSourceGaugeId: ctx.flow?.gaugeId ?? null,
		flowResolvedAt: ctx.flow ? ctx.now : null,
		visibility: 'private',
		createdAt: ctx.now,
		updatedAt: ctx.now,
	};
}

export function isOwnUserRequest(requestedUserId: string | null | undefined, currentUserId: string | null): boolean {
	if (!currentUserId) return false;
	const requested = requestedUserId || currentUserId;
	return requested === currentUserId;
}

export const USER_PROFILE_WRITABLE_FIELDS = ['skillLevel', 'yearsBoating', 'background', 'homeWatershedId', 'preExistingTripCountsJson'] as const;

export function pickUserProfileWritable(data: any): Record<string, any> {
	const out: Record<string, any> = {};
	if (!data || typeof data !== 'object') return out;
	for (const k of USER_PROFILE_WRITABLE_FIELDS) {
		if (data[k] !== undefined) out[k] = data[k];
	}
	return out;
}
