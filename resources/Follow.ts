import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

async function listFollows(userId: string): Promise<any[]> {
	return collect(tables.Follow.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	}));
}

export class FollowResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }
	allowUpdate() { return true; }
	allowDelete() { return true; }

	async get() {
		const userId = getUserId(this.getContext());
		if (!userId) {
			return { authenticated: false, follows: [], corridorIds: [], sectionIds: [] };
		}

		const follows = await listFollows(userId);
		const corridorIds = follows
			.filter((f: any) => f.targetType === 'corridor')
			.map((f: any) => f.targetId);
		const sectionIds = follows
			.filter((f: any) => f.targetType === 'section')
			.map((f: any) => f.targetId);

		return {
			authenticated: true,
			follows: follows.map((f: any) => ({
				targetType: f.targetType,
				targetId: f.targetId,
				createdAt: f.createdAt,
			})),
			corridorIds,
			sectionIds,
		};
	}

	async post(data: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const { targetType, targetId, action = 'toggle' } = data ?? {};

		if (!targetType || !['corridor', 'section'].includes(targetType)) {
			return new Response('targetType must be "corridor" or "section"', { status: 400 });
		}
		if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
			return new Response('targetId is required', { status: 400 });
		}
		if (!['toggle', 'add', 'remove'].includes(action)) {
			return new Response('action must be "toggle", "add", or "remove"', { status: 400 });
		}

		const id = compositeId([userId, targetType, targetId]);
		const existing = await tables.Follow.get(id);

		let following: boolean;

		if (action === 'remove' || (action === 'toggle' && existing)) {
			if (existing) await tables.Follow.delete(id);
			following = false;
		} else {
			// add or toggle-to-add
			if (!existing) {
				await tables.Follow.put({
					id,
					userId,
					targetType,
					targetId,
					createdAt: isoNow(),
				});
			}
			following = true;
		}

		return { ok: true, following, targetType, targetId };
	}
}
