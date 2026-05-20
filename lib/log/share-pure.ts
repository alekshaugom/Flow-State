import { normalizeEmail } from '../auth/password-pure.ts';
import { isExpired, isConsumed } from '../auth/token-pure.ts';

export const DEFAULT_SHARE_TTL_MINUTES = 7 * 24 * 60;

export type ShareInputResult =
	| { ok: true; value: { tripId: string; inviteeEmail: string } }
	| { ok: false; error: string; status: number };

export function validateShareInput(input: any): ShareInputResult {
	if (!input || typeof input !== 'object') return { ok: false, error: 'request body required', status: 400 };
	const tripId = typeof input.tripId === 'string' ? input.tripId.trim() : '';
	if (!tripId) return { ok: false, error: 'tripId required', status: 400 };
	const inviteeEmail = normalizeEmail(input.inviteeEmail);
	if (!inviteeEmail) return { ok: false, error: 'inviteeEmail required and must be valid', status: 400 };
	return { ok: true, value: { tripId, inviteeEmail } };
}

export function isShareValid(share: any, now: Date = new Date()): boolean {
	if (!share) return false;
	if (isConsumed(share.usedAt)) return false;
	if (isExpired(share.expiresAt, now)) return false;
	return true;
}

export type ShareConsumeReason = 'invalid' | 'expired' | 'consumed' | 'ok';

export function classifyShare(share: any, now: Date = new Date()): ShareConsumeReason {
	if (!share) return 'invalid';
	if (isConsumed(share.usedAt)) return 'consumed';
	if (isExpired(share.expiresAt, now)) return 'expired';
	return 'ok';
}
