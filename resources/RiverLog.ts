import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { resolveFlowForTrip } from '../lib/log/flow-resolver.ts';
import { shouldRetryFlowResolution } from '../lib/log/flow-resolver-pure.ts';
import {
	pickWritable,
	buildNewLogRow,
} from '../lib/log/river-log-pure.ts';
import { validateVisibility } from '../lib/log/visibility-pure.ts';
import { canUserAccessTrip } from '../lib/log/participant-pure.ts';
import { loadParticipantsForTrips } from '../lib/log/participants-loader.ts';
import {
	validateDateRange,
	validateCampingAgainstRange,
	parseCamping,
	stringifyCamping,
	tripNightsBetween,
} from '../lib/log/multi-day-pure.ts';
import { denormalizeCraftToLog } from '../lib/log/user-craft-pure.ts';

async function resolveCraftForUser(craftId: string | null | undefined, userId: string): Promise<{ ok: true; craft: any } | { ok: false; error: string; status: number } | null> {
	if (!craftId) return null;
	const craft = await tables.UserCraft.get(craftId);
	if (!craft) return { ok: false, error: 'craft not found', status: 404 };
	if ((craft as any).userId !== userId) return { ok: false, error: 'craft not owned by current user', status: 403 };
	return { ok: true, craft };
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

async function tryLazyResolveFlow(log: any): Promise<{ flowAtTripCfs: number; flowSourceGaugeId: string; flowResolvedAt: string } | null> {
	if (log.flowAtTripCfs != null) return null;
	if (!shouldRetryFlowResolution(log.date)) return null;
	const flow = await resolveFlowForTrip(log.sectionId, log.date);
	if (!flow) return null;
	const patch = {
		flowAtTripCfs: flow.cfs,
		flowSourceGaugeId: flow.gaugeId,
		flowResolvedAt: isoNow(),
	};
	await tables.RiverLog.patch(log.id, patch);
	return patch;
}

type AccessCheck = { ok: true } | { ok: false; status: number };

async function tripAccessCheck(tripId: string, userId: string): Promise<AccessCheck> {
	const row = await tables.TripParticipant.get(compositeId([tripId, userId]));
	const state = canUserAccessTrip(row);
	if (state === 'accepted') return { ok: true };
	if (state === 'not-found') return { ok: false, status: 404 };
	return { ok: false, status: 403 };
}

async function listTripIdsForUser(userId: string): Promise<Set<string>> {
	const ids = new Set<string>();
	for await (const r of tables.TripParticipant.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	})) {
		if (canUserAccessTrip(r) !== 'accepted') continue;
		ids.add((r as any).tripId);
	}
	return ids;
}

export class RiverLogResource extends Resource {
	allowRead() { return true; }
	allowCreate() { return true; }
	allowUpdate() { return true; }
	allowDelete() { return true; }

	async get(target?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		if (target?.id) {
			const row = await tables.RiverLog.get(target.id);
			if (!row) return new Response('Not found', { status: 404 });
			const access = await tripAccessCheck(target.id, userId);
			if (!access.ok) return new Response(access.status === 404 ? 'Not found' : 'Forbidden', { status: access.status });
			const patched = await tryLazyResolveFlow(row);
			const base = patched ? { ...row, ...patched } : { ...(row as any) };
			const participantsByTrip = await loadParticipantsForTrips(tables, [target.id], userId);
			(base as any).participants = participantsByTrip.get(target.id) || [];
			return base;
		}

		const tripIds = await listTripIdsForUser(userId);
		if (tripIds.size === 0) return { logs: [], total: 0 };

		const sectionFilter = target?.sectionId;
		const rows: any[] = [];
		for (const id of tripIds) {
			const row = await tables.RiverLog.get(id);
			if (!row) continue;
			if (sectionFilter && (row as any).sectionId !== sectionFilter) continue;
			rows.push({ ...(row as any) });
		}
		for (const r of rows) {
			const patch = await tryLazyResolveFlow(r);
			if (patch) Object.assign(r, patch);
		}
		rows.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
		return { logs: rows, total: rows.length };
	}

	async post(data: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		if (!data?.sectionId || !data?.date) {
			return new Response('sectionId and date required', { status: 400 });
		}
		const visError = validateVisibility(data.visibility);
		if (visError) return new Response(visError.error, { status: visError.status });

		const dateErr = validateDateRange(data.date, data.endDate ?? null);
		if (dateErr) return new Response(dateErr.error, { status: dateErr.status });

		const camping = Array.isArray(data.camping)
			? data.camping
			: parseCamping(data.campingJson);
		const campingErr = validateCampingAgainstRange(camping, data.date, data.endDate ?? null);
		if (campingErr) return new Response(campingErr.error, { status: campingErr.status });
		const campingJson = stringifyCamping(camping);

		const section = await tables.RiverSection.get(data.sectionId);
		if (!section) return new Response('Section not found', { status: 404 });
		const corridor = (section as any).corridorId ? await tables.RiverCorridor.get((section as any).corridorId) : null;

		const craftResolution = await resolveCraftForUser(data.craftId, userId);
		if (craftResolution && !craftResolution.ok) return new Response(craftResolution.error, { status: craftResolution.status });
		const denormCraft = craftResolution?.ok ? denormalizeCraftToLog(craftResolution.craft) : null;

		const flow = await resolveFlowForTrip(data.sectionId, data.date);
		const now = isoNow();
		const id = compositeId([userId, data.sectionId, data.date, String(Date.now())]);

		const log = buildNewLogRow(
			{
				userId,
				sectionId: data.sectionId,
				date: data.date,
				endDate: data.endDate || null,
				campingJson,
				craftId: craftResolution?.ok ? (craftResolution.craft as any).id : null,
				craftType: denormCraft?.craftType ?? data.craftType,
				craftSize: denormCraft?.craftSize ?? data.craftSize,
				craftName: denormCraft?.craftName ?? data.craftName,
				crewSize: data.crewSize,
				durationHours: data.durationHours,
				putIn: data.putIn,
				takeOut: data.takeOut,
				notes: data.notes,
				conditionsTags: data.conditionsTags,
			},
			{ section, corridor, flow, id, now },
		);
		(log as any).createdByUserId = userId;
		if (data.visibility === 'participants') (log as any).visibility = 'participants';

		await tables.RiverLog.put(log);

		// Self-participant row — this user is now an accepted participant on their own trip.
		// craftSequenceJson + notes mirror the legacy denormalized fields. As participants
		// invite others (LogShareResource.consume) or direct-add (TripParticipantResource.post),
		// additional rows land in the same shape.
		const participantId = compositeId([id, userId]);
		const craftSequence = (log as any).craftId
			? [{
				craftId: (log as any).craftId,
				craftType: (log as any).craftType,
				craftSize: (log as any).craftSize,
				craftName: (log as any).craftName,
			}]
			: [];
		await tables.TripParticipant.put({
			id: participantId,
			tripId: id,
			userId,
			addedBy: userId,
			invitedAt: now,
			acceptedAt: now,
			declinedAt: null,
			removedAt: null,
			notes: (log as any).notes || '',
			notesPrivate: false,
			craftSequenceJson: craftSequence.length ? JSON.stringify(craftSequence) : null,
			craftIds: craftSequence.length ? [craftSequence[0].craftId] : [],
			createdAt: now,
			updatedAt: now,
		});

		return log;
	}

	async patch(data: any, query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id || data?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.RiverLog.get(id);
		if (!existing) return new Response('Not found', { status: 404 });
		const access = await tripAccessCheck(id, userId);
		if (!access.ok) return new Response(access.status === 404 ? 'Not found' : 'Forbidden', { status: access.status });

		const visError = validateVisibility(data.visibility);
		if (visError) return new Response(visError.error, { status: visError.status });

		const allowed = pickWritable(data);
		const existingDate = (existing as any).date;
		const existingEndDate = (existing as any).endDate ?? null;

		const effectiveDate = ('date' in allowed) ? (allowed as any).date : existingDate;
		const effectiveEndDate = ('endDate' in allowed)
			? ((allowed as any).endDate || null)
			: existingEndDate;

		if ('date' in allowed || 'endDate' in allowed) {
			const dateErr = validateDateRange(effectiveDate, effectiveEndDate);
			if (dateErr) return new Response(dateErr.error, { status: dateErr.status });
			(allowed as any).tripNights = tripNightsBetween(effectiveDate, effectiveEndDate);
		}

		// If the caller supplied camping in any form, validate against the effective range.
		const hasCampingIn = (data && (Array.isArray((data as any).camping) || typeof (data as any).campingJson === 'string'));
		if (hasCampingIn) {
			const camping = Array.isArray((data as any).camping)
				? (data as any).camping
				: parseCamping((data as any).campingJson);
			const campingErr = validateCampingAgainstRange(camping, effectiveDate, effectiveEndDate);
			if (campingErr) return new Response(campingErr.error, { status: campingErr.status });
			(allowed as any).campingJson = stringifyCamping(camping);
		} else if ('endDate' in allowed && (effectiveEndDate == null || effectiveEndDate === effectiveDate)) {
			(allowed as any).campingJson = null;
		}

		if (data.date && existingDate && data.date !== existingDate) {
			const flow = await resolveFlowForTrip((existing as any).sectionId, data.date);
			(allowed as any).flowAtTripCfs = flow?.cfs ?? null;
			(allowed as any).flowSourceGaugeId = flow?.gaugeId ?? null;
			(allowed as any).flowResolvedAt = flow ? isoNow() : null;
		}

		if ('craftId' in allowed) {
			const newCraftId = (allowed as any).craftId;
			if (newCraftId) {
				const craftResolution = await resolveCraftForUser(newCraftId, userId);
				if (craftResolution && !craftResolution.ok) return new Response(craftResolution.error, { status: craftResolution.status });
				if (craftResolution?.ok) {
					const denorm = denormalizeCraftToLog(craftResolution.craft);
					(allowed as any).craftType = denorm.craftType;
					(allowed as any).craftSize = denorm.craftSize;
					(allowed as any).craftName = denorm.craftName;
				}
			} else {
				(allowed as any).craftId = null;
			}
		}

		if (data.visibility !== undefined) {
			(allowed as any).visibility = data.visibility ?? 'private';
		}

		(allowed as any).updatedAt = isoNow();
		await tables.RiverLog.patch(id, allowed);
		return await tables.RiverLog.get(id);
	}

	async delete(query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.RiverLog.get(id);
		if (!existing) return new Response('Not found', { status: 404 });
		// Only the trip's creator can delete it outright; other participants
		// remove themselves via TripParticipant.
		const creator = (existing as any).createdByUserId || (existing as any).userId;
		if (creator !== userId) return new Response('Forbidden', { status: 403 });

		// Cascade: delete all TripParticipant rows + LogShare rows for this trip.
		for await (const p of tables.TripParticipant.search({
			conditions: [{ attribute: 'tripId', value: id, comparator: 'equals' as const }],
		})) {
			await tables.TripParticipant.delete((p as any).id);
		}
		for await (const s of tables.LogShare.search({
			conditions: [{ attribute: 'tripId', value: id, comparator: 'equals' as const }],
		})) {
			await tables.LogShare.delete((s as any).id);
		}

		await tables.RiverLog.delete(id);
		return { ok: true, id };
	}
}
