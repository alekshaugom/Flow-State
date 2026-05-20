export type PromotionDecision = 'create' | 'promote' | 'noop' | 'reject-denied';

/**
 * State machine for what happens when a non-authenticated user accepts a share invite.
 * - No row → create a fresh WaitlistUser with status='approved'
 * - status 'approved' → no change (already in)
 * - status anything else but 'denied' (waitlist/pending/etc) → promote to 'approved'
 * - status 'denied' → reject; admin trust must not be bypassed by side-channel growth
 */
export function decidePromotion(existingUser: { status?: string | null } | null | undefined): PromotionDecision {
	if (!existingUser) return 'create';
	const status = existingUser.status;
	if (status === 'denied') return 'reject-denied';
	if (status === 'approved') return 'noop';
	return 'promote';
}
