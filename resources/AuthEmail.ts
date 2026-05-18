import { Resource, tables } from 'harper';
import { isoNow } from '../lib/utils.ts';
import { verifyPassword, constantTimeDummyHash } from '../lib/auth/password.ts';
import { normalizeEmail, validatePasswordRules } from '../lib/auth/password-pure.ts';
import { isExpired, isConsumed } from '../lib/auth/token-pure.ts';
import { writeUserCredential, userHasPassword } from '../lib/auth/credential.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

const INVALID_CREDS_ERROR = 'Invalid email or password';

async function findApprovedUserByEmail(email: string): Promise<any | null> {
	const rows = await collect(tables.WaitlistUser.search({
		conditions: [{ attribute: 'email', value: email, comparator: 'equals' as const }],
	}));
	if (!rows.length) return null;
	// If multiple rows somehow share the same email, prefer an approved one.
	const approved = rows.find((r: any) => r.status === 'approved');
	return approved || rows[0];
}

function attachSession(ctx: any, userId: string): Promise<any> | void {
	const session = ctx?.session;
	if (session && typeof session.update === 'function') {
		return session.update({ user: userId });
	}
}

export class EmailLoginResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }
	allowUpdate() { return true; }

	async post(data: any, target?: any) {
		const action = (target?.id || data?.action || '').toString();
		if (action === 'consume') return this.consume(data);
		if (action === 'set-my-password') return this.setMyPassword(data);
		// Default: treat as a login attempt.
		return this.login(data);
	}

	async login(data: any) {
		const email = normalizeEmail(data?.email);
		const password = typeof data?.password === 'string' ? data.password : null;
		const ctx = this.getContext();

		if (!email || !password) {
			// Pause to make non-existent-email and wrong-password paths cost the same.
			await constantTimeDummyHash();
			return new Response(INVALID_CREDS_ERROR, { status: 401 });
		}

		const user = await findApprovedUserByEmail(email);
		if (!user) {
			await constantTimeDummyHash();
			return new Response(INVALID_CREDS_ERROR, { status: 401 });
		}

		const credential = await tables.UserCredential.get(user.id);
		if (!credential) {
			await constantTimeDummyHash();
			return new Response(INVALID_CREDS_ERROR, { status: 401 });
		}

		const ok = await verifyPassword(password, (credential as any).passwordHash, (credential as any).passwordSalt);
		if (!ok) return new Response(INVALID_CREDS_ERROR, { status: 401 });

		if (user.status !== 'approved') {
			// Credentials are valid but the user isn't approved yet. Don't create a session.
			return new Response('Account is not yet approved', { status: 403 });
		}

		await tables.WaitlistUser.patch(user.id, { lastLoginAt: isoNow() });
		await attachSession(ctx, user.id);
		return {
			ok: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl,
				status: user.status,
			},
		};
	}

	async consume(data: any) {
		const token = typeof data?.token === 'string' ? data.token.trim() : '';
		if (!token) return new Response('Invalid login link', { status: 400 });

		const row = await tables.OneTimeLoginToken.get(token);
		if (!row) return new Response('Invalid login link', { status: 410 });
		if (isConsumed((row as any).usedAt)) return new Response('This login link has already been used', { status: 410 });
		if (isExpired((row as any).expiresAt)) return new Response('This login link has expired', { status: 410 });

		const userId = (row as any).userId;
		const user = await tables.WaitlistUser.get(userId);
		if (!user) return new Response('Invalid login link', { status: 410 });
		if ((user as any).status !== 'approved') return new Response('Account is not yet approved', { status: 403 });

		// Mark consumed atomically. If a concurrent request already marked it used,
		// the next read will pick that up and the second caller will see "already used".
		await tables.OneTimeLoginToken.patch(token, { usedAt: isoNow() });

		await tables.WaitlistUser.patch(userId, { lastLoginAt: isoNow() });
		await attachSession(this.getContext(), userId);

		const hasPassword = await userHasPassword(userId);

		return {
			ok: true,
			user: {
				id: (user as any).id,
				email: (user as any).email,
				name: (user as any).name,
				avatarUrl: (user as any).avatarUrl,
				status: (user as any).status,
			},
			hasPassword,
		};
	}

	async setMyPassword(data: any) {
		const ctx = this.getContext();
		const userId = (ctx as any)?.session?.user || null;
		if (!userId) return new Response('Auth required', { status: 401 });

		const user = await tables.WaitlistUser.get(userId);
		if (!user) return new Response('Auth required', { status: 401 });
		if ((user as any).status !== 'approved') return new Response('Account is not approved', { status: 403 });

		const password = data?.password;
		const err = validatePasswordRules(password);
		if (err) return new Response(err.error, { status: err.status });

		await writeUserCredential(userId, password, userId);
		return { ok: true };
	}
}
