export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

export type PasswordValidationError = { error: string; status: number } | null;

export function validatePasswordRules(plain: any): PasswordValidationError {
	if (typeof plain !== 'string') return { error: 'password must be a string', status: 400 };
	if (plain.length < MIN_PASSWORD_LENGTH) return { error: `password must be at least ${MIN_PASSWORD_LENGTH} characters`, status: 400 };
	if (plain.length > MAX_PASSWORD_LENGTH) return { error: `password must be at most ${MAX_PASSWORD_LENGTH} characters`, status: 400 };
	return null;
}

export function normalizeEmail(email: any): string | null {
	if (typeof email !== 'string') return null;
	const trimmed = email.trim().toLowerCase();
	if (!trimmed) return null;
	// Minimal validation — Harper isn't sending email and we let admins create anything.
	if (!trimmed.includes('@')) return null;
	if (trimmed.length > 254) return null;
	return trimmed;
}
