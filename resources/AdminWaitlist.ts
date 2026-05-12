import { Resource, tables } from 'harper';
import { isoNow } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

async function isApprovedUser(context: any): Promise<boolean> {
	if (process.env.NODE_ENV !== 'production') return true;
	const session = context?.session;
	if (!session?.user) return false;
	const record = await tables.WaitlistUser.get(session.user);
	return record?.status === 'approved';
}

export class AdminWaitlist extends Resource {
	async allowRead() {
		return isApprovedUser(this.getContext());
	}

	async allowCreate() {
		return isApprovedUser(this.getContext());
	}

	async get() {
		const all = await collect(
			tables.WaitlistUser.search({ conditions: [] })
		);

		const order: Record<string, number> = { waitlist: 0, approved: 1, denied: 2 };
		all.sort((a: any, b: any) => {
			const statusDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
			if (statusDiff !== 0) return statusDiff;
			return (b.createdAt || '').localeCompare(a.createdAt || '');
		});

		return { users: all, total: all.length };
	}

	async post(data: any) {
		const { userId, action } = data;
		if (!userId || !['approve', 'deny', 'revoke'].includes(action)) {
			return new Response('userId and action (approve|deny|revoke) required', { status: 400 });
		}

		const user = await tables.WaitlistUser.get(userId);
		if (!user) {
			return new Response('User not found', { status: 404 });
		}

		const session = this.getContext()?.session;
		const adminId = session?.user || 'unknown';

		if (action === 'approve') {
			await tables.WaitlistUser.patch(userId, {
				status: 'approved',
				grantedAt: isoNow(),
				grantedBy: adminId,
			});
		} else if (action === 'deny') {
			await tables.WaitlistUser.patch(userId, {
				status: 'denied',
				grantedAt: isoNow(),
				grantedBy: adminId,
			});
		} else if (action === 'revoke') {
			await tables.WaitlistUser.patch(userId, {
				status: 'waitlist',
				grantedAt: null,
				grantedBy: null,
			});
		}

		return { ok: true, userId, action };
	}
}
