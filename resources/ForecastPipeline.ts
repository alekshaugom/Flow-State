import { Resource, tables } from 'harper';
import { compositeId, isoNow, isoDate, daysAgo, getFlowStatus } from '../lib/utils.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

function splitIds(ids: string | null | undefined): string[] {
	if (!ids) return [];
	return ids.split(',').map(s => s.trim()).filter(Boolean);
}

async function buildDataPackage(sectionId: string) {
	const section = await tables.RiverSection.get(sectionId);
	if (!section) return null;

	const river = await tables.River.get(section.riverId);
	const cutoff30d = daysAgo(30).toISOString();

	// Recent gauge readings
	const readings = section.primaryGaugeId
		? await collect(tables.GaugeReading.search({
			conditions: [
				{ attribute: 'gaugeId', value: section.primaryGaugeId, comparator: 'equals' },
				{ attribute: 'timestamp', value: cutoff30d, comparator: 'gte' },
			],
			sort: { attribute: 'timestamp', descending: true },
		}))
		: [];

	const currentFlow = readings[0]?.value ?? null;
	const reading24hAgo = readings.find((r: any) => new Date(r.timestamp).getTime() <= Date.now() - 24 * 3600_000);
	const reading7dAgo = readings.find((r: any) => new Date(r.timestamp).getTime() <= Date.now() - 7 * 24 * 3600_000);

	// Daily averages for the last 30 days
	const dailyMap = new Map<string, { sum: number; count: number }>();
	for (const r of readings) {
		const day = r.timestamp.split('T')[0];
		const entry = dailyMap.get(day) || { sum: 0, count: 0 };
		entry.sum += r.value;
		entry.count++;
		dailyMap.set(day, entry);
	}
	const dailyAverages = Array.from(dailyMap.entries())
		.map(([date, { sum, count }]) => ({ date, avgFlow: Math.round(sum / count) }))
		.sort((a, b) => a.date.localeCompare(b.date));

	// Snowpack
	const basinIds = splitIds(section.snowpackBasinIds);
	const snowpackData = [];
	for (const bid of basinIds) {
		const latest = await collect(tables.SnowpackReading.search({
			conditions: [{ attribute: 'basinId', value: bid, comparator: 'equals' }],
			sort: { attribute: 'timestamp', descending: true },
			limit: 1,
		}));
		if (latest.length) snowpackData.push({ basinId: bid, ...latest[0] });
	}

	// Reservoir releases
	const reservoirIds = splitIds(section.reservoirIds);
	const reservoirData = [];
	for (const rid of reservoirIds) {
		const latest = await collect(tables.DamRelease.search({
			conditions: [{ attribute: 'reservoirId', value: rid, comparator: 'equals' }],
			sort: { attribute: 'timestamp', descending: true },
			limit: 1,
		}));
		if (latest.length) {
			const reservoir = await tables.Reservoir.get(rid);
			reservoirData.push({ reservoirId: rid, name: reservoir?.name, ...latest[0] });
		}
	}

	return {
		section: {
			id: section.id,
			name: section.name,
			river: river?.name,
			difficulty: `${section.difficultyMin}-${section.difficultyMax}`,
			thresholds: {
				low: section.flowLow,
				runnable: section.flowRunnable,
				idealMin: section.flowIdealMin,
				idealMax: section.flowIdealMax,
				high: section.flowHigh,
				expert: section.flowExpert,
				dangerous: section.flowDangerous,
			},
		},
		currentConditions: {
			flow: currentFlow ? Math.round(currentFlow) : null,
			unit: 'cfs',
			timestamp: readings[0]?.timestamp || null,
			change24h: (currentFlow && reading24hAgo) ? Math.round(currentFlow - reading24hAgo.value) : null,
			change7d: (currentFlow && reading7dAgo) ? Math.round(currentFlow - reading7dAgo.value) : null,
			status: currentFlow ? getFlowStatus(currentFlow, {
				low: section.flowLow, runnable: section.flowRunnable,
				idealMin: section.flowIdealMin, idealMax: section.flowIdealMax,
				high: section.flowHigh, expert: section.flowExpert,
				dangerous: section.flowDangerous,
			}) : 'unknown',
		},
		historicalContext: { last30Days: dailyAverages },
		snowpack: snowpackData,
		reservoirs: reservoirData,
		generatedAt: isoNow(),
	};
}

function generateStubForecast(sectionId: string, dataPackage: any): any[] {
	const outputs: any[] = [];
	const baseFlow = dataPackage.currentConditions.flow || 500;
	const trend = dataPackage.currentConditions.change24h || 0;

	// Simple projection: current flow + decaying trend + seasonal factor
	const today = new Date();
	const month = today.getMonth();
	// Seasonal multiplier: peak in June (month=5), low in September (month=8)
	const seasonalPeak = 5;
	const monthsFromPeak = Math.abs(month - seasonalPeak);

	for (let day = 1; day <= 30; day++) {
		const date = new Date(today);
		date.setDate(date.getDate() + day);
		const dateStr = isoDate(date);

		// Decay trend over 30 days, add seasonal noise
		const trendFactor = trend * Math.exp(-day / 10);
		const seasonalFactor = monthsFromPeak <= 2 ? 1.05 : 0.95;
		const dailyNoise = 1 + (day % 3 - 1) * 0.02;

		const expected = Math.max(0, Math.round((baseFlow + trendFactor) * seasonalFactor * dailyNoise));
		const variance = Math.max(50, Math.round(expected * 0.1 * (1 + day / 30)));
		const flowMin = Math.max(0, expected - variance);
		const flowMax = expected + variance;
		const confidence = Math.max(0.3, 1 - day * 0.02);

		const id = compositeId([sectionId, 'stub', dateStr]);
		outputs.push({
			id,
			forecastRunId: compositeId([sectionId, isoNow()]),
			date: dateStr,
			flowMin,
			flowMax,
			flowExpected: expected,
			confidence: Math.round(confidence * 100) / 100,
			assumptions: 'Stub forecast using linear projection with seasonal adjustment. Replace with LLM-generated forecast when API keys are configured.',
			safetyNotes: expected > (dataPackage.section.thresholds.expert || 5000)
				? 'Projected flows exceed expert-only threshold. Monitor conditions closely.'
				: null,
		});
	}
	return outputs;
}

export class ForecastPipeline extends Resource {
	async get(target?: any) {
		const sectionId = target?.id;
		if (!sectionId) return new Response('sectionId required in URL path', { status: 400 });

		const dataPackage = await buildDataPackage(sectionId);
		if (!dataPackage) return new Response('Section not found', { status: 404 });

		return dataPackage;
	}

	async post(target?: any, data?: any) {
		const sectionId = data?.sectionId || target?.id;
		if (!sectionId) return new Response('sectionId required', { status: 400 });

		const dataPackage = await buildDataPackage(sectionId);
		if (!dataPackage) return new Response('Section not found', { status: 404 });

		const runId = compositeId([sectionId, isoNow()]);
		await tables.ForecastRun.put(runId, {
			id: runId,
			sectionId,
			createdAt: isoNow(),
			model: 'stub-v1',
			status: 'running',
			inputPackage: JSON.stringify(dataPackage),
			notes: 'Stub forecast — LLM integration pending API key configuration.',
		});

		// TODO: When LLM_PROVIDER and LLM_API_KEY env vars are set,
		// replace generateStubForecast with an actual LLM call that sends
		// dataPackage as a structured prompt and parses JSON output.
		const outputs = generateStubForecast(sectionId, dataPackage);

		// Set the correct forecastRunId on all outputs
		for (const o of outputs) {
			o.forecastRunId = runId;
			await tables.ForecastOutput.put(o.id, o);
		}

		await tables.ForecastRun.patch(runId, { status: 'complete' });

		return { runId, forecastDays: outputs.length, model: 'stub-v1' };
	}
}
