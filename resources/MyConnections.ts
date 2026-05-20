import { Resource, tables } from 'harper';
import { canUserAccessTrip } from '../lib/log/participant-pure.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

interface ConnectionAgg {
	userId: string;
	name: string | null;
	email: string | null;
	avatarUrl: string | null;
	lastTripDate: string | null;
	tripsTogetherCount: number;
}

export class MyConnectionsView extends Resource {
	allowRead() { return true; }

	async get() {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		// 1. Find every trip I'm an accepted, non-removed participant on.
		const myParticipantRows = await collect(tables.TripParticipant.search({
			conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
		}));
		const myTripIds = myParticipantRows
			.filter(r => canUserAccessTrip(r) === 'accepted')
			.map(r => (r as any).tripId);

		if (myTripIds.length === 0) {
			return { connections: [], total: 0 };
		}

		// 2. Collect every other participant on those trips.
		const aggMap = new Map<string, ConnectionAgg & { tripIds: Set<string> }>();
		// Also track the trip dates so we can report lastTripDate.
		const tripDates = new Map<string, string | null>();
		for (const tripId of myTripIds) {
			const trip = await tables.RiverLog.get(tripId);
			if (trip) tripDates.set(tripId, (trip as any).date || null);

			const others = await collect(tables.TripParticipant.search({
				conditions: [{ attribute: 'tripId', value: tripId, comparator: 'equals' as const }],
			}));
			for (const o of others) {
				const otherUserId = (o as any).userId;
				if (otherUserId === userId) continue;
				if (canUserAccessTrip(o) !== 'accepted') continue;

				let agg = aggMap.get(otherUserId);
				if (!agg) {
					agg = {
						userId: otherUserId,
						name: null,
						email: null,
						avatarUrl: null,
						lastTripDate: null,
						tripsTogetherCount: 0,
						tripIds: new Set(),
					};
					aggMap.set(otherUserId, agg);
				}
				if (!agg.tripIds.has(tripId)) {
					agg.tripIds.add(tripId);
					agg.tripsTogetherCount += 1;
					const d = tripDates.get(tripId);
					if (d && (!agg.lastTripDate || d > agg.lastTripDate)) agg.lastTripDate = d;
				}
			}
		}

		// 3. Hydrate user display fields.
		for (const agg of aggMap.values()) {
			const user = await tables.WaitlistUser.get(agg.userId);
			if (user) {
				agg.name = (user as any).name || null;
				agg.email = (user as any).email || null;
				agg.avatarUrl = (user as any).avatarUrl || null;
			}
		}

		const connections: ConnectionAgg[] = Array.from(aggMap.values())
			.map(({ tripIds, ...rest }) => rest)
			.sort((a, b) => (b.lastTripDate || '').localeCompare(a.lastTripDate || ''));

		return { connections, total: connections.length };
	}
}
