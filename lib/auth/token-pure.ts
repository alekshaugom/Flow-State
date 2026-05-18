export const DEFAULT_TOKEN_TTL_MINUTES = 24 * 60;
export const MIN_TOKEN_TTL_MINUTES = 5;
export const MAX_TOKEN_TTL_MINUTES = 7 * 24 * 60;

export type TokenTtlError = { error: string; status: number } | null;

export function validateTtlMinutes(value: any, fallback: number = DEFAULT_TOKEN_TTL_MINUTES): { ok: true; minutes: number } | { ok: false; error: string; status: number } {
	if (value == null || value === '') return { ok: true, minutes: fallback };
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
		return { ok: false, error: 'ttlMinutes must be a positive integer', status: 400 };
	}
	if (n < MIN_TOKEN_TTL_MINUTES) return { ok: false, error: `ttlMinutes must be at least ${MIN_TOKEN_TTL_MINUTES}`, status: 400 };
	if (n > MAX_TOKEN_TTL_MINUTES) return { ok: false, error: `ttlMinutes must be at most ${MAX_TOKEN_TTL_MINUTES}`, status: 400 };
	return { ok: true, minutes: n };
}

export function computeExpiresAt(now: Date, ttlMinutes: number): string {
	return new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
}

export function isExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
	if (!expiresAt || typeof expiresAt !== 'string') return true;
	const ms = Date.parse(expiresAt);
	if (isNaN(ms)) return true;
	return now.getTime() >= ms;
}

export function isConsumed(usedAt: string | null | undefined): boolean {
	return typeof usedAt === 'string' && usedAt.length > 0;
}
