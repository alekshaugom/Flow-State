import { Resource, tables } from 'harper';
import { isoNow } from '../lib/utils.ts';
import { validatePasswordRules } from '../lib/auth/password-pure.ts';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';
import { mintLoginToken } from '../lib/auth/token.ts';
import { computeExpiresAt, validateTtlMinutes } from '../lib/auth/token-pure.ts';
import { emailToUserId, validateInviteInput } from '../lib/auth/invite-pure.ts';
import { writeUserCredential } from '../lib/auth/credential.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

async function findUserByEmail(email: string): Promise<any | null> {
	const rows = await collect(tables.WaitlistUser.search({
		conditions: [{ attribute: 'email', value: email, comparator: 'equals' as const }],
	}));
	return rows[0] || null;
}

async function mintAndStoreLoginLink(userId: string, adminId: string, ttlMinutes: number, ctx: any): Promise<{ token: string; url: string; expiresAt: string }> {
	const token = mintLoginToken();
	const now = new Date();
	const expiresAt = computeExpiresAt(now, ttlMinutes);
	await tables.OneTimeLoginToken.put({
		id: token,
		userId,
		createdBy: adminId,
		expiresAt,
		usedAt: null,
		createdAt: now.toISOString(),
	});
	const url = buildLoginUrl(token, (ctx as any)?.request || (ctx as any));
	return { token, url, expiresAt };
}

async function isApprovedUser(context: any): Promise<{ ok: true; adminId: string } | { ok: false }> {
	const session = context?.session;
	const adminId = session?.user || null;
	if (process.env.NODE_ENV !== 'production') {
		return { ok: true, adminId: adminId || 'dev_local' };
	}
	if (!adminId) return { ok: false };
	const record = await tables.WaitlistUser.get(adminId);
	if ((record as any)?.status !== 'approved') return { ok: false };
	return { ok: true, adminId };
}

async function isAdminUser(context: any): Promise<{ ok: true; adminId: string } | { ok: false }> {
	const session = context?.session;
	const adminId = session?.user || null;
	if (process.env.NODE_ENV !== 'production') {
		return { ok: true, adminId: adminId || 'dev_local' };
	}
	if (!adminId) return { ok: false };
	const record = await tables.WaitlistUser.get(adminId);
	if (!record) return { ok: false };
	const caps = resolveCapabilities(record as any);
	if (!caps.isAdmin) return { ok: false };
	return { ok: true, adminId };
}

function buildLoginUrl(token: string, request: any): string {
	const headers = request?.headers;
	const host = headers?.get?.('host') || headers?.host || '';
	const forwardedProto = headers?.get?.('x-forwarded-proto') || headers?.['x-forwarded-proto'];
	// Local dev hosts serve HTTP; everything else defaults to HTTPS unless a proxy
	// has explicitly told us otherwise via x-forwarded-proto.
	const isLocal = /^(localhost|127\.0\.0\.1|\[?::1)\b/i.test(host);
	const proto = forwardedProto || (isLocal ? 'http' : 'https');
	const base = host ? `${proto}://${host}` : '';
	return `${base}/login?token=${encodeURIComponent(token)}`;
}

export class AdminAuthResource extends Resource {
	async allowRead() { return (await isApprovedUser(this.getContext())).ok; }
	async allowCreate() { return (await isApprovedUser(this.getContext())).ok; }

	async post(data: any) {
		const ctx = this.getContext();
		const auth = await isApprovedUser(ctx);
		if (!auth.ok) return new Response('Forbidden', { status: 403 });

		const action = data?.action;

		if (action === 'invite-user') {
			return this.inviteUser(data, auth.adminId, ctx);
		}

		const targetUserId = data?.userId;
		if (!targetUserId || typeof targetUserId !== 'string') {
			return new Response('userId required', { status: 400 });
		}

		if (action === 'delete-user') {
			return this.deleteUser(targetUserId);
		}

		const targetUser = await tables.WaitlistUser.get(targetUserId);
		if (!targetUser) return new Response('User not found', { status: 404 });

		if (action === 'set-password') {
			const password = data?.password;
			const err = validatePasswordRules(password);
			if (err) return new Response(err.error, { status: err.status });
			const hadPriorPassword = !!(await tables.UserCredential.get(targetUserId));
			await writeUserCredential(targetUserId, password, auth.adminId);
			return { ok: true, userId: targetUserId, hadPriorPassword };
		}

		if (action === 'create-login-link') {
			const ttl = validateTtlMinutes(data?.ttlMinutes);
			if (!ttl.ok) return new Response(ttl.error, { status: ttl.status });
			const link = await mintAndStoreLoginLink(targetUserId, auth.adminId, ttl.minutes, ctx);
			return { ok: true, ...link };
		}

		if (action === 'revoke-token') {
			const tokenId = data?.tokenId;
			if (!tokenId || typeof tokenId !== 'string') return new Response('tokenId required', { status: 400 });
			const row = await tables.OneTimeLoginToken.get(tokenId);
			if (!row) return new Response('Token not found', { status: 404 });
			if ((row as any).usedAt) return { ok: true, tokenId, alreadyUsed: true };
			await tables.OneTimeLoginToken.patch(tokenId, { usedAt: isoNow() });
			return { ok: true, tokenId };
		}

		if (action === 'list-tokens') {
			const out: any[] = [];
			for await (const t of tables.OneTimeLoginToken.search({
				conditions: [{ attribute: 'userId', value: targetUserId, comparator: 'equals' as const }],
			})) out.push(t);
			out.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
			return { tokens: out };
		}

		if (action === 'grant-role') {
			const roleAuth = await isAdminUser(ctx);
			if (!roleAuth.ok) return new Response('Forbidden', { status: 403 });
			const role = data?.role;
			if (!['admin', 'superadmin', 'member'].includes(role)) {
				return new Response('Invalid role', { status: 400 });
			}
			await tables.WaitlistUser.patch(targetUserId, { role });
			return { ok: true, userId: targetUserId, role };
		}

		if (action === 'revoke-role') {
			const roleAuth = await isAdminUser(ctx);
			if (!roleAuth.ok) return new Response('Forbidden', { status: 403 });
			await tables.WaitlistUser.patch(targetUserId, { role: 'member' });
			return { ok: true, userId: targetUserId, role: 'member' };
		}

		return new Response('Unknown action', { status: 400 });
	}

	async inviteUser(data: any, adminId: string, ctx: any) {
		const validation = validateInviteInput(data);
		if (!validation.ok) return new Response(validation.error, { status: validation.status });
		const { email, firstName, lastName, name } = validation.value;

		// Duplicate guard: bail if any existing user shares this email (case-insensitive,
		// since normalizeEmail lowercased the input above).
		const existing = await findUserByEmail(email);
		if (existing) {
			return new Response(JSON.stringify({
				error: 'A user with this email already exists',
				existingUserId: (existing as any).id,
			}), {
				status: 409,
				headers: { 'content-type': 'application/json' },
			});
		}

		const userId = emailToUserId(email);
		// Secondary guard: deterministic-slug collision (different email canonicalizing
		// to the same id). Rare, but the user gets a clean error rather than a silent overwrite.
		if (await tables.WaitlistUser.get(userId)) {
			return new Response(JSON.stringify({
				error: 'A user with a conflicting id already exists; invite under a different email',
				existingUserId: userId,
			}), {
				status: 409,
				headers: { 'content-type': 'application/json' },
			});
		}

		const now = isoNow();
		const user = {
			id: userId,
			email,
			name,
			firstName,
			lastName,
			avatarUrl: null,
			provider: 'email',
			status: 'approved',
			createdAt: now,
			grantedAt: now,
			grantedBy: adminId,
			lastLoginAt: null,
		};
		await tables.WaitlistUser.put(user);

		// 12j: invites always mint a one-time login link. The user picks their own
		// password after clicking it via the 12i activation flow.
		const link = await mintAndStoreLoginLink(userId, adminId, 24 * 60, ctx);

		return { ok: true, user, link };
	}

	async deleteUser(targetUserId: string) {
		const user = await tables.WaitlistUser.get(targetUserId);
		if (!user) return new Response('User not found', { status: 404 });

		const deleted = {
			user: 0,
			credential: 0,
			tokens: 0,
			crafts: 0,
			logs: 0,
			participants: 0,
			sharesInvited: 0,
			sharesAccepted: 0,
		};

		// Order: dependents first, then the WaitlistUser row itself. If a downstream
		// delete fails partway, the user still shows in the admin UI so the admin
		// can retry the purge.

		// UserCredential is keyed by userId.
		if (await tables.UserCredential.get(targetUserId)) {
			await tables.UserCredential.delete(targetUserId);
			deleted.credential = 1;
		}

		// OneTimeLoginToken: many per user.
		for await (const t of tables.OneTimeLoginToken.search({
			conditions: [{ attribute: 'userId', value: targetUserId, comparator: 'equals' as const }],
		})) {
			await tables.OneTimeLoginToken.delete((t as any).id);
			deleted.tokens += 1;
		}

		// UserCraft: many per user.
		for await (const c of tables.UserCraft.search({
			conditions: [{ attribute: 'userId', value: targetUserId, comparator: 'equals' as const }],
		})) {
			await tables.UserCraft.delete((c as any).id);
			deleted.crafts += 1;
		}

		// TripParticipant: scrub the user's rows on every trip they were on.
		// We do this BEFORE deleting their RiverLog rows so a trip the deleted
		// user created (and is the only participant on) still has its participant
		// row found and cleaned up here.
		for await (const p of tables.TripParticipant.search({
			conditions: [{ attribute: 'userId', value: targetUserId, comparator: 'equals' as const }],
		})) {
			await tables.TripParticipant.delete((p as any).id);
			deleted.participants += 1;
		}

		// LogShare: tokens this user minted as inviter.
		for await (const s of tables.LogShare.search({
			conditions: [{ attribute: 'inviterUserId', value: targetUserId, comparator: 'equals' as const }],
		})) {
			await tables.LogShare.delete((s as any).id);
			deleted.sharesInvited += 1;
		}
		// LogShare: tokens this user consumed (rare — but keep clean).
		for await (const s of tables.LogShare.search({
			conditions: [{ attribute: 'usedBy', value: targetUserId, comparator: 'equals' as const }],
		})) {
			await tables.LogShare.delete((s as any).id);
			deleted.sharesAccepted += 1;
		}

		// RiverLog: trips the user created. Cascade their participant rows + shares
		// for those trips too (loop catches our own user-keyed rows separately above).
		for await (const l of tables.RiverLog.search({
			conditions: [{ attribute: 'userId', value: targetUserId, comparator: 'equals' as const }],
		})) {
			const tripId = (l as any).id;
			for await (const p of tables.TripParticipant.search({
				conditions: [{ attribute: 'tripId', value: tripId, comparator: 'equals' as const }],
			})) {
				await tables.TripParticipant.delete((p as any).id);
				deleted.participants += 1;
			}
			for await (const s of tables.LogShare.search({
				conditions: [{ attribute: 'tripId', value: tripId, comparator: 'equals' as const }],
			})) {
				await tables.LogShare.delete((s as any).id);
				deleted.sharesInvited += 1;
			}
			await tables.RiverLog.delete(tripId);
			deleted.logs += 1;
		}

		await tables.WaitlistUser.delete(targetUserId);
		deleted.user = 1;

		return { ok: true, userId: targetUserId, deleted };
	}
}
