import { normalizeEmail } from './password-pure.ts';
import { joinFirstLast } from './user-name-pure.ts';

const MAX_NAME_PART_LENGTH = 80;

export interface InviteInput {
	email?: any;
	firstName?: any;
	lastName?: any;
}

export type InviteValidationError = { error: string; status: number } | null;

export interface NormalizedInvite {
	email: string;
	firstName: string;
	lastName: string;
	name: string;
}

/**
 * Deterministic admin-invite user-id slug.
 *
 * Lossy by design — collapses non-alphanumeric runs to a single underscore so the
 * id stays URL-friendly. Two distinct emails can collide; duplicate prevention
 * happens via the email-index lookup in the resource layer, not via slug uniqueness.
 */
export function emailToUserId(email: string): string {
	const normalized = email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
	return `email_${normalized}`;
}

function validateNamePart(value: any, label: 'firstName' | 'lastName'): { ok: true; value: string } | { ok: false; error: string; status: number } {
	if (typeof value !== 'string') return { ok: false, error: `${label} is required`, status: 400 };
	const trimmed = value.trim();
	if (!trimmed) return { ok: false, error: `${label} is required`, status: 400 };
	if (trimmed.length > MAX_NAME_PART_LENGTH) {
		return { ok: false, error: `${label} is too long (${MAX_NAME_PART_LENGTH} chars max)`, status: 400 };
	}
	return { ok: true, value: trimmed };
}

export function validateInviteInput(input: InviteInput): { ok: true; value: NormalizedInvite } | { ok: false; error: string; status: number } {
	const email = normalizeEmail(input?.email);
	if (!email) return { ok: false, error: 'email is required and must be valid', status: 400 };

	const first = validateNamePart(input?.firstName, 'firstName');
	if (!first.ok) return first;
	const last = validateNamePart(input?.lastName, 'lastName');
	if (!last.ok) return last;

	return {
		ok: true,
		value: {
			email,
			firstName: first.value,
			lastName: last.value,
			name: joinFirstLast(first.value, last.value),
		},
	};
}
