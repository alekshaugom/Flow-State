import { Resource, tables } from 'harper';

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
	return (record as any)?.status === 'approved';
}

export class AdminRiverRequests extends Resource {
	async allowRead() {
		return isApprovedUser(this.getContext());
	}

	async get() {
		const requests = await collect(tables.RiverRequest.search({ conditions: [] }));

		// Aggregate by worldRiverId.
		interface Agg {
			worldRiverId: string;
			count: number;
			userIds: Set<string>;
			lastCreatedAt: string;
			firstRequestedAt: string;
			latestNote: string;
		}
		const aggMap = new Map<string, Agg>();
		for (const r of requests as any[]) {
			const id = r.worldRiverId;
			if (!id) continue;
			const a = aggMap.get(id) || {
				worldRiverId: id, count: 0, userIds: new Set<string>(),
				lastCreatedAt: '', firstRequestedAt: '', latestNote: '',
			};
			a.count += 1;
			if (r.userId) a.userIds.add(r.userId);
			const created = r.createdAt || '';
			if (!a.lastCreatedAt || created > a.lastCreatedAt) {
				a.lastCreatedAt = created;
				if (r.note) a.latestNote = r.note;
			}
			if (!a.firstRequestedAt || (created && created < a.firstRequestedAt)) {
				a.firstRequestedAt = created;
			}
			aggMap.set(id, a);
		}

		// Hydrate world river details for each unique river id.
		const out: any[] = [];
		for (const a of aggMap.values()) {
			const r = (await tables.WorldRiver.get(a.worldRiverId)) as any | null;
			out.push({
				worldRiverId: a.worldRiverId,
				name: r?.name || '(deleted)',
				country: r?.country || '',
				region: r?.region || null,
				continent: r?.continent || '',
				difficulty: r?.difficulty || null,
				learnMoreUrl: r?.learnMoreUrl || '',
				count: a.count,
				distinctUsers: a.userIds.size,
				lastRequestedAt: a.lastCreatedAt,
				firstRequestedAt: a.firstRequestedAt,
				latestNote: a.latestNote,
			});
		}

		// Rank by count desc, then last requested desc.
		out.sort((a, b) => {
			if (b.count !== a.count) return b.count - a.count;
			return (b.lastRequestedAt || '').localeCompare(a.lastRequestedAt || '');
		});

		return { requests: out, total: out.length };
	}
}
