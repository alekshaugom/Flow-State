import { Resource, tables } from 'harper';
import { getFlowStatus, daysAgo } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function splitIds(ids: string | null | undefined): string[] {
	if (!ids) return [];
	return ids.split(',').map(s => s.trim()).filter(Boolean);
}

async function getFlowData(gaugeIds: string[], days = 90) {
	const cutoff = daysAgo(days).toISOString();
	const series: Record<string, any[]> = {};
	const gaugeList: any[] = [];

	for (const gid of gaugeIds) {
		const gauge = await tables.Gauge.get(gid);
		if (gauge) gaugeList.push(gauge);

		const readings = await collect(
			tables.GaugeReading.search({
				conditions: [
					{ attribute: 'gaugeId', value: gid, comparator: 'equals' as const },
				],
			})
		);
		const filtered = readings.filter((r: any) => (r.timestamp || '') >= cutoff);
		filtered.sort((a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || ''));
		series[gid] = filtered.map((r: any) => ({
			timestamp: r.timestamp,
			value: r.value,
			unit: r.unit,
		}));
	}

	const primaryReadings = series[gaugeIds[0]] || [];
	const latest = primaryReadings.length ? primaryReadings[primaryReadings.length - 1] : null;
	const prev24h = primaryReadings.find((r: any) => new Date(r.timestamp).getTime() >= Date.now() - 25 * 3600_000);

	return { series, gaugeList, latest, prev24h };
}

async function getDamReleases(reservoirIds: string[]) {
	const cutoff = daysAgo(14).toISOString();
	const results: any[] = [];

	for (const rid of reservoirIds) {
		const reservoir = await tables.Reservoir.get(rid);
		if (!reservoir) continue;

		const allReleases = await collect(
			tables.DamRelease.search({
				conditions: [
					{ attribute: 'reservoirId', value: rid, comparator: 'equals' as const },
				],
			})
		);
		const releases = allReleases.filter((r: any) => (r.timestamp || '') >= cutoff);
		releases.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));

		results.push({
			reservoir,
			latest: releases[0] || null,
			history: releases.slice(0, 14),
		});
	}
	return results;
}

async function getSnowpackData(basinIds: string[]) {
	const cutoff = daysAgo(30).toISOString();
	const results: any[] = [];

	for (const bid of basinIds) {
		const basin = await tables.SnowpackBasin.get(bid);
		if (!basin) continue;

		const allReadings = await collect(
			tables.SnowpackReading.search({
				conditions: [
					{ attribute: 'basinId', value: bid, comparator: 'equals' as const },
				],
			})
		);
		const readings = allReadings.filter((r: any) => (r.timestamp || '') >= cutoff);
		readings.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));

		results.push({
			basin,
			latest: readings[0] || null,
			history: readings.slice(0, 30),
		});
	}
	return results;
}

async function getLatestForecast(sectionId: string) {
	const runs = await collect(
		tables.ForecastRun.search({
			conditions: [
				{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const },
				{ attribute: 'status', value: 'complete', comparator: 'equals' as const },
			],
		})
	);
	runs.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
	if (!runs.length) return null;

	const outputs = await collect(
		tables.ForecastOutput.search({
			conditions: [{ attribute: 'forecastRunId', value: runs[0].id, comparator: 'equals' as const }],
		})
	);
	outputs.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

	return { run: runs[0], outputs };
}

export class RiverDetail extends Resource {
	allowRead() { return true; }
	async get(target?: any) {
		const sectionId = target?.id;
		if (!sectionId) return new Response('sectionId required in URL path', { status: 400 });

		const section = await tables.RiverSection.get(sectionId);
		if (!section) return new Response('Section not found', { status: 404 });

		const river = await tables.River.get(section.riverId);

		const gaugeIds = [section.primaryGaugeId, ...splitIds(section.upstreamGaugeIds), ...splitIds(section.downstreamGaugeIds)].filter(Boolean);
		const reservoirIds = splitIds(section.reservoirIds);
		const basinIds = splitIds(section.snowpackBasinIds);

		const [flowData, damReleases, snowpack, forecast] = await Promise.all([
			getFlowData(gaugeIds),
			getDamReleases(reservoirIds),
			getSnowpackData(basinIds),
			getLatestForecast(sectionId),
		]);

		const currentFlow = flowData.latest?.value ?? null;
		const status = currentFlow !== null
			? getFlowStatus(currentFlow, {
				low: section.flowLow, runnable: section.flowRunnable,
				idealMin: section.flowIdealMin, idealMax: section.flowIdealMax,
				high: section.flowHigh, expert: section.flowExpert,
				dangerous: section.flowDangerous,
			})
			: 'unknown';

		const change24h = (currentFlow && flowData.prev24h)
			? Math.round(currentFlow - flowData.prev24h.value)
			: null;

		const result = {
			section: {
				...section,
				difficulty: section.difficultyMax !== section.difficultyMin
					? `${section.difficultyMin}-${section.difficultyMax}`
					: section.difficultyMin,
			},
			river,
			flow: {
				current: currentFlow ? Math.round(currentFlow) : null,
				unit: 'cfs',
				status,
				change24h,
				trend: change24h !== null ? (change24h > 50 ? 'rising' : change24h < -50 ? 'falling' : 'steady') : 'unknown',
				timestamp: flowData.latest?.timestamp || null,
			},
			charts: flowData.series,
			gauges: flowData.gaugeList,
			reservoirs: damReleases,
			snowpack,
			forecast,
		};
		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	}
}
