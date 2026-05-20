import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { canUserAccessTrip, validateParticipantPatch } from '../lib/log/participant-pure.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

async function isAcceptedParticipant(tripId: string, userId: string): Promise<boolean> {
	const row = await tables.TripParticipant.get(compositeId([tripId, userId]));
	return canUserAccessTrip(row) === 'accepted';
}

export class TripParticipantResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }
	allowUpdate() { return true; }
	allowDelete() { return true; }

	async get(target?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		if (target?.id) {
			const row = await tables.TripParticipant.get(target.id);
			if (!row) return new Response('Not found', { status: 404 });
			// You may read a participant row if you're an accepted member of that trip.
			if (!(await isAcceptedParticipant((row as any).tripId, userId))) {
				return new Response('Forbidden', { status: 403 });
			}
			return row;
		}

		const tripId = target?.tripId;
		if (!tripId) return new Response('tripId required', { status: 400 });
		if (!(await isAcceptedParticipant(tripId, userId))) {
			return new Response('Forbidden', { status: 403 });
		}

		const rows = await collect(tables.TripParticipant.search({
			conditions: [{ attribute: 'tripId', value: tripId, comparator: 'equals' as const }],
		}));
		// Sort by invitedAt asc so the original creator (earliest) shows first.
		rows.sort((a: any, b: any) => (a.invitedAt || '').localeCompare(b.invitedAt || ''));
		return { participants: rows, total: rows.length };
	}

	async post(data: any) {
		const inviterUserId = getUserId(this.getContext());
		if (!inviterUserId) return new Response('Auth required', { status: 401 });

		const tripId = data?.tripId;
		const targetUserId = data?.userId;
		if (!tripId || !targetUserId) return new Response('tripId and userId required', { status: 400 });

		// Only an accepted participant of the trip may add others directly.
		if (!(await isAcceptedParticipant(tripId, inviterUserId))) {
			return new Response('Forbidden', { status: 403 });
		}

		// Target must be an approved waitlist user.
		const target = await tables.WaitlistUser.get(targetUserId);
		if (!target) return new Response('Target user not found', { status: 404 });
		if ((target as any).status !== 'approved') return new Response('Target user is not approved', { status: 403 });

		const id = compositeId([tripId, targetUserId]);
		const existing = await tables.TripParticipant.get(id);
		if (existing) {
			// Idempotent: if they were already invited/accepted, just return the existing row.
			return existing;
		}

		// Adding a second participant promotes the trip to participants visibility.
		const trip = await tables.RiverLog.get(tripId);
		if (trip && (trip as any).visibility !== 'participants') {
			await tables.RiverLog.patch(tripId, { visibility: 'participants', updatedAt: isoNow() });
		}

		const now = isoNow();
		const row = {
			id,
			tripId,
			userId: targetUserId,
			addedBy: inviterUserId,
			invitedAt: now,
			// Direct-add (e.g. from past-connections picker) implicitly accepts —
			// the inviter is asserting both parties already know each other.
			acceptedAt: now,
			declinedAt: null,
			removedAt: null,
			notes: '',
			notesPrivate: false,
			craftSequenceJson: null,
			craftIds: [],
			createdAt: now,
			updatedAt: now,
		};
		await tables.TripParticipant.put(row);
		return row;
	}

	async patch(data: any, query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id || data?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.TripParticipant.get(id);
		if (!existing) return new Response('Not found', { status: 404 });

		const isSelf = (existing as any).userId === userId;
		// Non-self callers must themselves be accepted participants to mark someone removed.
		if (!isSelf && !(await isAcceptedParticipant((existing as any).tripId, userId))) {
			return new Response('Forbidden', { status: 403 });
		}

		const result = validateParticipantPatch(data, isSelf);
		if (!result.ok) return new Response(result.error, { status: result.status });

		const patch: Record<string, any> = { ...result.fields, updatedAt: isoNow() };
		await tables.TripParticipant.patch(id, patch);
		return await tables.TripParticipant.get(id);
	}

	async delete(query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.TripParticipant.get(id);
		if (!existing) return new Response('Not found', { status: 404 });
		// Only self can hard-delete their participant row. Others soft-remove via PATCH removedAt.
		if ((existing as any).userId !== userId) return new Response('Forbidden', { status: 403 });

		await tables.TripParticipant.delete(id);
		return { ok: true, id };
	}
}
