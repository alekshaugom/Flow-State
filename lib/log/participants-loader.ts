import { canUserAccessTrip, toParticipantView, type ParticipantView } from './participant-pure.ts';

/**
 * Load accepted participants for one or more trips, hydrate display fields,
 * and group by tripId. `viewerUserId` flags the self row so private notes
 * stay private to other viewers.
 *
 * Takes `tables` as a parameter so the same helper is reusable across
 * resources without making this file depend on the harper module directly.
 */
export async function loadParticipantsForTrips(
	tables: any,
	tripIds: Iterable<string>,
	viewerUserId: string | null,
): Promise<Map<string, ParticipantView[]>> {
	const out = new Map<string, ParticipantView[]>();
	const rawByTrip = new Map<string, any[]>();
	const userIds = new Set<string>();

	for (const tripId of tripIds) {
		const rows: any[] = [];
		for await (const r of tables.TripParticipant.search({
			conditions: [{ attribute: 'tripId', value: tripId, comparator: 'equals' as const }],
		})) {
			if (canUserAccessTrip(r) !== 'accepted') continue;
			rows.push(r);
			if ((r as any).userId) userIds.add((r as any).userId);
		}
		rawByTrip.set(tripId, rows);
	}

	const userMap = new Map<string, any>();
	for (const uid of userIds) {
		const u = await tables.WaitlistUser.get(uid);
		if (u) userMap.set(uid, u);
	}

	for (const [tripId, rows] of rawByTrip) {
		const views = rows.map(r => toParticipantView(
			r,
			userMap.get((r as any).userId) || null,
			!!viewerUserId && (r as any).userId === viewerUserId,
		));
		views.sort((a, b) => (a.acceptedAt || '').localeCompare(b.acceptedAt || ''));
		out.set(tripId, views);
	}
	return out;
}
