import { Resource, tables } from 'harper';
import { resolveFlowForTrip } from '../lib/log/flow-resolver.ts';
import { shouldRetryFlowResolution } from '../lib/log/flow-resolver-pure.ts';
import { isoNow } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function getUserId(ctx: any): string | null {
	return ctx?.session?.user || null;
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

		const rows = await collect(tables.RiverLog.search({
			conditions: [
				{ attribute: 'userId', value: userId, comparator: 'equals' as const },
				{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const },
			],
		}));

		const resolved = [];
		for (const r of rows) resolved.push(await tryLazyResolveFlow(r));
		resolved.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

		const profile = await tables.UserProfile.get(userId);

		return {
			sectionId,
			logs: resolved,
			total: resolved.length,
			profile: profile || null,
		};
	}
}
