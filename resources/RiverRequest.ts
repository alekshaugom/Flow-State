import { Resource, tables } from 'harper';
import { isoNow, compositeId } from '../lib/utils.ts';

const NOTE_MAX = 500;

function resolveUserId(context: any): string | null {
	const sessionUser = context?.session?.user;
	if (sessionUser) return sessionUser;
	// Mirror the dev bypass used by AdminWaitlist / front-end useAuth — production
	// must always have a real session, but dev/local should be testable.
	if (process.env.NODE_ENV !== 'production') return 'dev_local';
	return null;
}

export class RiverRequestResource extends Resource {
	allowRead() {
		// Authenticated users see their own; unauth get an empty list.
		return true;
	}

	allowCreate() {
		return !!resolveUserId(this.getContext());
	}

	async get() {
		const userId = resolveUserId(this.getContext());
		if (!userId) return { authenticated: false, requests: [] };

		const own: any[] = [];
		for await (const r of tables.RiverRequest.search({
			conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
		})) {
			own.push(r);
		}
		own.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
		return { authenticated: true, requests: own };
	}

	async post(data: any) {
		const userId = resolveUserId(this.getContext());
		if (!userId) {
			return new Response(JSON.stringify({ error: 'auth required' }), {
				status: 401, headers: { 'Content-Type': 'application/json' },
			});
		}

		const worldRiverId = String(data?.worldRiverId || '').trim();
		if (!worldRiverId) {
			return new Response(JSON.stringify({ error: 'worldRiverId required' }), {
				status: 400, headers: { 'Content-Type': 'application/json' },
			});
		}

		const worldRiver = await tables.WorldRiver.get(worldRiverId);
		if (!worldRiver) {
			return new Response(JSON.stringify({ error: 'world river not found' }), {
				status: 404, headers: { 'Content-Type': 'application/json' },
			});
		}

		const note = String(data?.note || '').slice(0, NOTE_MAX);
		const id = compositeId([worldRiverId, userId]);
		const now = isoNow();
		const existing = await tables.RiverRequest.get(id);

		if (existing) {
			await tables.RiverRequest.patch(id, { updatedAt: now, note: note || (existing as any).note });
			return { ok: true, id, alreadyExisted: true };
		}

		await tables.RiverRequest.put({
			id,
			worldRiverId,
			userId,
			createdAt: now,
			updatedAt: now,
			note,
		});
		return { ok: true, id, alreadyExisted: false };
	}
}
