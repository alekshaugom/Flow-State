/**
 * Compose a display name from first + last. Trims internally so empty strings
 * collapse cleanly. Returns an empty string when both parts are empty.
 */
export function joinFirstLast(firstName: string | null | undefined, lastName: string | null | undefined): string {
	const first = typeof firstName === 'string' ? firstName.trim() : '';
	const last = typeof lastName === 'string' ? lastName.trim() : '';
	if (first && last) return `${first} ${last}`;
	return first || last || '';
}

export interface NameParts {
	firstName: string;
	lastName: string;
}

/**
 * Lossy split of a single-string name into first + last.
 * - One token → `firstName` only.
 * - Two or more tokens → first token is `firstName`, the rest is `lastName`.
 * - Empty / whitespace → both empty.
 * Used only for display fallback (e.g. when an existing OAuth row carries only `name`).
 */
export function splitName(fullName: string | null | undefined): NameParts {
	if (typeof fullName !== 'string') return { firstName: '', lastName: '' };
	const tokens = fullName.trim().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return { firstName: '', lastName: '' };
	if (tokens.length === 1) return { firstName: tokens[0], lastName: '' };
	return { firstName: tokens[0], lastName: tokens.slice(1).join(' ') };
}

export function displayName(user: { name?: string | null; firstName?: string | null; lastName?: string | null } | null | undefined): string {
	if (!user) return '';
	const joined = joinFirstLast(user.firstName, user.lastName);
	if (joined) return joined;
	return typeof user.name === 'string' ? user.name.trim() : '';
}
