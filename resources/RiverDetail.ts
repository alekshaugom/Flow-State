import { Resource, tables } from 'harper';
import { getFlowStatus, daysAgo, isoNow } from '../lib/utils.ts';
import { loadBandsForSection, resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';
import { getCorridorById } from '../lib/corridors.ts';
import { getWatershedById } from '../lib/watersheds.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function splitIds(ids: string | null | undefined): string[] {
	if (!ids) return [];
	return ids.split(',').map(s => s.trim()).filter(Boolean);
}

async function getFlowData(gaugeIds: string[], days = 360) {
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
					{ attribute: 'timestamp', value: cutoff, comparator: 'gte' as const },
				],
				sort: { attribute: 'timestamp', descending: false },
			})
		);
		series[gid] = readings.map((r: any) => ({
			timestamp: r.timestamp,
			value: r.value,
			unit: r.unit,
		}));
	}

	const primaryReadings = series[gaugeIds[0]] || [];
	let latest = primaryReadings.length ? primaryReadings[primaryReadings.length - 1] : null;
	const prev24h = primaryReadings.find((r: any) => new Date(r.timestamp).getTime() >= Date.now() - 25 * 3600_000);

	// Defensive fallback: if GaugeReading search returned empty (e.g. transient
	// replication lag after a deploy), borrow current flow from GaugeSnapshot —
	// the denormalized cache the ingestion worker keeps fresh.
	if (!latest && gaugeIds[0]) {
		const snap = await tables.GaugeSnapshot.get(gaugeIds[0]);
		if (snap && snap.currentFlow != null) {
			latest = {
				timestamp: snap.updatedAt || isoNow(),
				value: snap.currentFlow,
				unit: snap.unit || 'cfs',
			};
		}
	}

	return { series, gaugeList, latest, prev24h };
}

async function getDamReleases(reservoirIds: string[]) {
	const cutoff = daysAgo(14).toISOString();
	const results: any[] = [];

	for (const rid of reservoirIds) {
		const reservoir = await tables.Reservoir.get(rid);
		if (!reservoir) continue;

		const releases = await collect(
			tables.DamRelease.search({
				conditions: [
					{ attribute: 'reservoirId', value: rid, comparator: 'equals' as const },
					{ attribute: 'timestamp', value: cutoff, comparator: 'gte' as const },
				],
				sort: { attribute: 'timestamp', descending: true },
			})
		);

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

		const readings = await collect(
			tables.SnowpackReading.search({
				conditions: [
					{ attribute: 'basinId', value: bid, comparator: 'equals' as const },
					{ attribute: 'timestamp', value: cutoff, comparator: 'gte' as const },
				],
				sort: { attribute: 'timestamp', descending: true },
			})
		);

		results.push({
			basin,
			latest: readings[0] || null,
			history: readings.slice(0, 30),
		});
	}
	return results;
}

async function getWeatherForecast(sectionId: string) {
	const todayDate = new Date().toISOString().split('T')[0];
	return collect(
		tables.WeatherForecast.search({
			conditions: [
				{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const },
				{ attribute: 'date', value: todayDate, comparator: 'gte' as const },
			],
			sort: { attribute: 'date', descending: false },
			limit: 14,
		})
	);
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
		const corridor = section.corridorId ? await getCorridorById(section.corridorId) : null;
		const watershedId = corridor?.watershedId || (river as any)?.watershedId || null;
		const watershed = watershedId ? await getWatershedById(watershedId) : null;

		const gaugeIds = [section.primaryGaugeId, ...splitIds(section.upstreamGaugeIds), ...splitIds(section.downstreamGaugeIds)].filter(Boolean);
		const reservoirIds = splitIds(section.reservoirIds);
		const basinIds = splitIds(section.snowpackBasinIds);

		const [flowData, damReleases, snowpack, weatherForecast, forecast, flowBands] = await Promise.all([
			getFlowData(gaugeIds),
			getDamReleases(reservoirIds),
			getSnowpackData(basinIds),
			getWeatherForecast(sectionId),
			getLatestForecast(sectionId),
			loadBandsForSection(sectionId),
		]);

		const currentFlow = flowData.latest?.value ?? null;
		const roundedFlow = currentFlow !== null ? Math.round(currentFlow) : null;

		// Resolve current band for the default selection (raft + intermediate).
		// The frontend has all bands and re-resolves locally when the user toggles.
		const resolvedBand = resolveFromCache(flowBands, section, 'raft', 'intermediate', roundedFlow);

		const status = resolvedBand
			? bandToDesignStatus(resolvedBand.bandName)
			: (currentFlow !== null
				? getFlowStatus(currentFlow, {
					low: section.flowLow, runnable: section.flowRunnable,
					idealMin: section.flowIdealMin, idealMax: section.flowIdealMax,
					high: section.flowHigh, expert: section.flowExpert,
					dangerous: section.flowDangerous,
				})
				: 'unknown');
		const statusLabel = resolvedBand ? bandToLabel(resolvedBand.bandName) : null;

		const change24h = (currentFlow && flowData.prev24h)
			? Math.round(currentFlow - flowData.prev24h.value)
			: null;

		const breadcrumb = [
			{ slug: 'colorado', name: 'Colorado', href: '/' },
			...(watershed ? [{ slug: watershed.id, name: watershed.name, href: `/watershed/${watershed.id}` }] : []),
			...(corridor ? [{ slug: corridor.id, name: corridor.name, href: `/corridor/${corridor.id}` }] : []),
			{ slug: section.id, name: section.name, href: `/section/${section.id}` },
		];

		const result = {
			section: {
				...section,
				difficulty: section.difficultyMax !== section.difficultyMin
					? `${section.difficultyMin}-${section.difficultyMax}`
					: section.difficultyMin,
			},
			river,
			watershed,
			corridor,
			breadcrumb,
			flow: {
				current: roundedFlow,
				unit: 'cfs',
				status,
				statusLabel,
				change24h,
				trend: change24h !== null ? (change24h > 50 ? 'rising' : change24h < -50 ? 'falling' : 'steady') : 'unknown',
				timestamp: flowData.latest?.timestamp || null,
			},
			flowBands,
			resolvedBand,
			charts: flowData.series,
			gauges: flowData.gaugeList,
			reservoirs: damReleases,
			snowpack,
			weatherForecast,
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
