import { Resource, tables } from 'harper';
import { resolveFlowForTrip } from '../lib/log/flow-resolver.ts';
import { shouldRetryFlowResolution } from '../lib/log/flow-resolver-pure.ts';
import { isoNow } from '../lib/utils.ts';
import { canUserAccessTrip } from '../lib/log/participant-pure.ts';
import { loadParticipantsForTrips } from '../lib/log/participants-loader.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
}

async function loadAccessibleLogsForSection(userId: string, sectionId: string): Promise<any[]> {
	const out: any[] = [];
	for await (const r of tables.TripParticipant.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	})) {
		if (canUserAccessTrip(r) !== 'accepted') continue;
		const log = await tables.RiverLog.get((r as any).tripId);
		if (!log) continue;
		if ((log as any).sectionId !== sectionId) continue;
		out.push({ ...(log as any) });
	}
	return out;
}

async function tryLazyResolveFlow(log: any): Promise<any> {
	if (log.flowAtTripCfs != null) return log;
	if (!shouldRetryFlowResolution(log.date)) return log;
	const flow = await resolveFlowForTrip(log.sectionId, log.date);
	if (!flow) return log;
	const patch = {
		flowAtTripCfs: flow.cfs,
		flowSourceGaugeId: flow.gaugeId,
		flowResolvedAt: isoNow(),
	};
	await tables.RiverLog.patch(log.id, patch);
	return { ...log, ...patch };
}

export class SectionLogsView extends Resource {
	allowRead() { return true; }

	async get(target?: any) {
		const userId = getUserId(this.getContext());
		if (!userId) return new Response('Auth required', { status: 401 });

		const sectionId = target?.id;
		if (!sectionId) return new Response('sectionId required in URL path', { status: 400 });

		const rows = await loadAccessibleLogsForSection(userId, sectionId);

		const resolved = [];
		for (const r of rows) resolved.push(await tryLazyResolveFlow(r));
		resolved.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

		const participantsByTrip = await loadParticipantsForTrips(tables, resolved.map((l: any) => l.id), userId);
		const logsWithParticipants = resolved.map((l: any) => ({
			...l,
			participants: participantsByTrip.get(l.id) || [],
		}));

		return {
			sectionId,
			logs: logsWithParticipants,
			total: logsWithParticipants.length,
		};
	}
}
