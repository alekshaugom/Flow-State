import { Resource, tables } from 'harper';
import { compositeId, isoNow } from '../lib/utils.ts';
import { resolveFlowForTrip } from '../lib/log/flow-resolver.ts';
import { shouldRetryFlowResolution } from '../lib/log/flow-resolver-pure.ts';
import {
	pickWritable,
	validateVisibility,
	validateOwnership,
	buildNewLogRow,
} from '../lib/log/river-log-pure.ts';
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
			const check = validateOwnership(row, userId);
			if (check === 'not-found') return new Response('Not found', { status: 404 });
			if (check === 'forbidden') return new Response('Forbidden', { status: 403 });
			const patched = await tryLazyResolveFlow(row);
			return patched ? { ...row, ...patched } : row;
		}

		const sectionFilter = target?.sectionId;
		const conditions: any[] = [{ attribute: 'userId', value: userId, comparator: 'equals' as const }];
		if (sectionFilter) conditions.push({ attribute: 'sectionId', value: sectionFilter, comparator: 'equals' as const });

		// Spread out of Harper's read-only proxy so we can fold lazy-resolve patches in.
		const rowProxies = await collect(tables.RiverLog.search({ conditions }));
		const rows: any[] = rowProxies.map(r => ({ ...(r as any) }));
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

		await tables.RiverLog.put(log);
		return log;
	}

	async patch(data: any, query?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const id = query?.id || data?.id;
		if (!id) return new Response('id required', { status: 400 });

		const existing = await tables.RiverLog.get(id);
		const check = validateOwnership(existing, userId);
		if (check === 'not-found') return new Response('Not found', { status: 404 });
		if (check === 'forbidden') return new Response('Forbidden', { status: 403 });

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
			// Collapsing to single-day; clear any stale camping the row may carry.
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
		const check = validateOwnership(existing, userId);
		if (check === 'not-found') return new Response('Not found', { status: 404 });
		if (check === 'forbidden') return new Response('Forbidden', { status: 403 });

		await tables.RiverLog.delete(id);
		return { ok: true, id };
	}
}
