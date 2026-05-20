import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { mintLoginToken } from '../lib/auth/token.ts';
import { computeExpiresAt, isExpired, isConsumed } from '../lib/auth/token-pure.ts';
import { decidePromotion } from '../lib/auth/share-accept-pure.ts';
import { canUserAccessTrip } from '../lib/log/participant-pure.ts';
import { validateShareInput, DEFAULT_SHARE_TTL_MINUTES } from '../lib/log/share-pure.ts';
import { buildShareUrl } from '../lib/share/share-url-pure.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

async function findUserByEmail(email: string): Promise<any | null> {
	const rows = await collect(tables.WaitlistUser.search({
		conditions: [{ attribute: 'email', value: email, comparator: 'equals' as const }],
	}));
	return rows[0] || null;
}

async function isAcceptedParticipant(tripId: string, userId: string): Promise<boolean> {
	const row = await tables.TripParticipant.get(compositeId([tripId, userId]));
	return canUserAccessTrip(row) === 'accepted';
}

function attachSession(ctx: any, userId: string): Promise<any> | void {
	const session = ctx?.session;
	if (session && typeof session.update === 'function') {
		return session.update({ user: userId });
	}
}

function emailToInviteeUserId(email: string): string {
	// Mirrors lib/auth/invite-pure.ts:emailToUserId. Inlined to avoid creating a
	// cycle through the auth-invite-pure module; tests cover the deterministic shape.
	const normalized = email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
	return `email_${normalized}`;
}

export class LogShareResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }

	async post(data: any) {
		const ctx = this.getContext();
		const action = data?.action;

		// Preview is intentionally unauthenticated — the recipient may not have an
		// account yet. Returns just enough to render an accept page; no log content.
		if (action === 'preview') return this.preview(data);
		if (action === 'consume') return this.consume(data, ctx);

		// All other actions require an authenticated user.
		const userId = getUserId(ctx);
		if (!userId) return new Response('Auth required', { status: 401 });

		if (action === 'mint') return this.mint(data, userId, ctx);
		if (action === 'revoke') return this.revoke(data, userId);
		if (action === 'list') return this.list(data, userId);

		return new Response('Unknown action', { status: 400 });
	}

	async mint(data: any, inviterUserId: string, ctx: any) {
		const validation = validateShareInput(data);
		if (!validation.ok) return new Response(validation.error, { status: validation.status });
		const { tripId, inviteeEmail } = validation.value;

		if (!(await isAcceptedParticipant(tripId, inviterUserId))) {
			return new Response('Forbidden', { status: 403 });
		}

		const trip = await tables.RiverLog.get(tripId);
		if (!trip) return new Response('Trip not found', { status: 404 });

		// Inviting someone implicitly promotes the trip to participants visibility —
		// otherwise the invitee couldn't be discovered via the access predicate.
		if ((trip as any).visibility !== 'participants') {
			await tables.RiverLog.patch(tripId, { visibility: 'participants', updatedAt: isoNow() });
		}

		const token = mintLoginToken();
		const now = new Date();
		const expiresAt = computeExpiresAt(now, DEFAULT_SHARE_TTL_MINUTES);

		await tables.LogShare.put({
			id: token,
			tripId,
			inviterUserId,
			inviteeEmail,
			expiresAt,
			usedAt: null,
			usedBy: null,
			createdAt: now.toISOString(),
		});

		const url = buildShareUrl(token, (ctx as any)?.request || (ctx as any));
		return { ok: true, token, url, expiresAt, inviteeEmail };
	}

	async preview(data: any) {
		const token = typeof data?.token === 'string' ? data.token.trim() : '';
		if (!token) return new Response('Invalid invite', { status: 400 });

		const share = await tables.LogShare.get(token);
		if (!share) return new Response('Invalid invite', { status: 410 });
		if (isConsumed((share as any).usedAt)) return new Response('This invite has already been used', { status: 410 });
		if (isExpired((share as any).expiresAt)) return new Response('This invite has expired', { status: 410 });

		const trip = await tables.RiverLog.get((share as any).tripId);
		if (!trip) return new Response('Trip not found', { status: 404 });

		const inviter = await tables.WaitlistUser.get((share as any).inviterUserId);
		const section = (trip as any).sectionId ? await tables.RiverSection.get((trip as any).sectionId) : null;

		return {
			ok: true,
			share: {
				tripId: (share as any).tripId,
				inviteeEmail: (share as any).inviteeEmail,
				expiresAt: (share as any).expiresAt,
			},
			trip: {
				id: (trip as any).id,
				date: (trip as any).date,
				endDate: (trip as any).endDate,
				sectionName: (section as any)?.name || null,
				sectionId: (trip as any).sectionId,
			},
			inviter: inviter
				? { id: (inviter as any).id, name: (inviter as any).name, avatarUrl: (inviter as any).avatarUrl }
				: null,
		};
	}

	async consume(data: any, ctx: any) {
		const token = typeof data?.token === 'string' ? data.token.trim() : '';
		if (!token) return new Response('Invalid invite', { status: 400 });

		const share = await tables.LogShare.get(token);
		if (!share) return new Response('Invalid invite', { status: 410 });
		if (isConsumed((share as any).usedAt)) return new Response('This invite has already been used', { status: 410 });
		if (isExpired((share as any).expiresAt)) return new Response('This invite has expired', { status: 410 });

		const inviteeEmail = (share as any).inviteeEmail;
		const tripId = (share as any).tripId;

		// Confirm the inviter is still a participant; revoke implicitly if not.
		if (!(await isAcceptedParticipant(tripId, (share as any).inviterUserId))) {
			await tables.LogShare.patch(token, { usedAt: isoNow() });
			return new Response('This invite is no longer valid', { status: 410 });
		}

		// Look up or create the invitee's WaitlistUser by email.
		let user = await findUserByEmail(inviteeEmail);
		const decision = decidePromotion(user);

		if (decision === 'reject-denied') {
			return new Response('This invite cannot be accepted', { status: 403 });
		}

		// If a different user is currently logged in, refuse rather than overwrite the session.
		// Two failure shapes we have to catch:
		//  - invitee matches an existing row, but it isn't the logged-in user (mismatch on id)
		//  - invitee has no row yet (`user` is null), and the logged-in user's email is
		//    something other than the invite email (auto-creating would silently re-bind
		//    the session to a brand-new account)
		const currentUserId = getUserId(ctx);
		if (currentUserId) {
			if (user && (user as any).id !== currentUserId) {
				return new Response('This invite is for a different account. Please sign out first.', { status: 409 });
			}
			if (!user) {
				const me = await tables.WaitlistUser.get(currentUserId);
				const myEmail = (me as any)?.email;
				if (myEmail !== inviteeEmail) {
					return new Response('This invite is for a different account. Please sign out first.', { status: 409 });
				}
			}
		}

		const now = isoNow();
		let userId: string;
		let needsPasswordSetup = false;

		if (decision === 'create') {
			userId = emailToInviteeUserId(inviteeEmail);
			// Guard against deterministic-slug collision (mirrors AdminAuth.inviteUser).
			const collision = await tables.WaitlistUser.get(userId);
			if (collision) {
				return new Response('A conflicting account exists; ask an admin to invite this user manually.', { status: 409 });
			}
			user = {
				id: userId,
				email: inviteeEmail,
				name: inviteeEmail,
				firstName: null,
				lastName: null,
				avatarUrl: null,
				provider: 'share-invite',
				status: 'approved',
				createdAt: now,
				grantedAt: now,
				grantedBy: (share as any).inviterUserId,
				lastLoginAt: now,
			};
			await tables.WaitlistUser.put(user);
			needsPasswordSetup = true;
		} else if (decision === 'promote') {
			userId = (user as any).id;
			await tables.WaitlistUser.patch(userId, {
				status: 'approved',
				grantedAt: now,
				grantedBy: (share as any).inviterUserId,
				lastLoginAt: now,
			});
			needsPasswordSetup = !(await tables.UserCredential.get(userId));
		} else {
			// noop — already approved.
			userId = (user as any).id;
			await tables.WaitlistUser.patch(userId, { lastLoginAt: now });
			needsPasswordSetup = !(await tables.UserCredential.get(userId));
		}

		// Create or revive the TripParticipant row for this user.
		const participantId = compositeId([tripId, userId]);
		const existingParticipant = await tables.TripParticipant.get(participantId);
		if (existingParticipant) {
			await tables.TripParticipant.patch(participantId, {
				acceptedAt: now,
				declinedAt: null,
				removedAt: null,
				updatedAt: now,
			});
		} else {
			await tables.TripParticipant.put({
				id: participantId,
				tripId,
				userId,
				addedBy: (share as any).inviterUserId,
				invitedAt: (share as any).createdAt || now,
				acceptedAt: now,
				declinedAt: null,
				removedAt: null,
				notes: '',
				notesPrivate: false,
				craftSequenceJson: null,
				craftIds: [],
				createdAt: now,
				updatedAt: now,
			});
		}

		// Mark token consumed atomically (concurrent consumes will see the second one's
		// usedAt set and reject; mirrors AuthEmail.consume pattern).
		await tables.LogShare.patch(token, { usedAt: now, usedBy: userId });

		await attachSession(ctx, userId);

		return {
			ok: true,
			tripId,
			userId,
			needsPasswordSetup,
			user: {
				id: (user as any).id,
				email: (user as any).email,
				name: (user as any).name,
				avatarUrl: (user as any).avatarUrl,
				status: (user as any).status,
			},
		};
	}

	async revoke(data: any, userId: string) {
		const token = typeof data?.token === 'string' ? data.token.trim() : '';
		if (!token) return new Response('token required', { status: 400 });

		const share = await tables.LogShare.get(token);
		if (!share) return new Response('Not found', { status: 404 });

		// Either the inviter or any accepted participant can revoke an unused token.
		const inviterMatch = (share as any).inviterUserId === userId;
		const isParticipant = inviterMatch || (await isAcceptedParticipant((share as any).tripId, userId));
		if (!isParticipant) return new Response('Forbidden', { status: 403 });

		if ((share as any).usedAt) return { ok: true, token, alreadyUsed: true };
		await tables.LogShare.patch(token, { usedAt: isoNow() });
		return { ok: true, token };
	}

	async list(data: any, userId: string) {
		const tripId = data?.tripId;
		if (!tripId) return new Response('tripId required', { status: 400 });
		if (!(await isAcceptedParticipant(tripId, userId))) {
			return new Response('Forbidden', { status: 403 });
		}
		const rows = await collect(tables.LogShare.search({
			conditions: [{ attribute: 'tripId', value: tripId, comparator: 'equals' as const }],
		}));
		rows.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
		return { shares: rows, total: rows.length };
	}
}
