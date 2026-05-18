import { Resource, tables } from 'harper';
import { isoNow } from '../lib/utils.ts';
import { isOwnUserRequest, pickUserProfileWritable } from '../lib/log/river-log-pure.ts';

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

export class UserProfileResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }
	allowUpdate() { return true; }
	allowDelete() { return true; }

	async get(target?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });
		if (!isOwnUserRequest(target?.id, userId)) return new Response('Forbidden', { status: 403 });

		const row = await tables.UserProfile.get(userId);
		return row || null;
	}

	async put(data: any, query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });
		if (!isOwnUserRequest(query?.id || data?.id, userId)) return new Response('Forbidden', { status: 403 });

		const allowed = pickUserProfileWritable(data);
		const now = isoNow();
		const existing = await tables.UserProfile.get(userId);
		const row = {
			...((existing as any) || {}),
			id: userId,
			userId,
			...allowed,
			updatedAt: now,
			createdAt: (existing as any)?.createdAt || now,
		};
		await tables.UserProfile.put(row);
		return row;
	}

	async post(data: any) {
		return this.put(data);
	}

	async patch(data: any, query?: any) {
		return this.put(data, query);
	}
}
