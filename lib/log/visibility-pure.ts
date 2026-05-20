export const ALLOWED_VISIBILITY = ['private', 'participants'] as const;
export type Visibility = typeof ALLOWED_VISIBILITY[number];

export type VisibilityError = { error: string; status: number } | null;

export function validateVisibility(visibility: any): VisibilityError {
	if (visibility === undefined || visibility === null) return null;
	if (ALLOWED_VISIBILITY.includes(visibility)) return null;
	return { error: `visibility must be one of: ${ALLOWED_VISIBILITY.join(', ')}`, status: 400 };
}

export function canInviteParticipants(trip: { visibility?: string | null } | null | undefined): boolean {
	if (!trip) return false;
	return trip.visibility === 'participants';
}
