import { mapStatusToDesign, mapTrend, STATUS_LABEL } from '../constants';
import type { DashboardSection, DetailViewModel, ForecastBandData, ApiDashboardResponse } from '../types';

export function transformDashboard(data: ApiDashboardResponse): DashboardSection[] {
	const sections: DashboardSection[] = [];
	for (const river of data.rivers) {
		for (const s of river.sections) {
			const designStatus = mapStatusToDesign(s.status);
			const trend = mapTrend(s.trend);
			const trendPct = s.currentFlow && s.change24h
				? Math.round((s.change24h / s.currentFlow) * 100)
				: 0;

			sections.push({
				id: s.id,
				river: river.name,
				section: s.name,
				classification: s.difficulty ? `Class ${s.difficulty}` : '',
				now: s.currentFlow,
				status: designStatus,
				statusLabel: STATUS_LABEL[s.status] || STATUS_LABEL[designStatus],
				trend,
				trendPct,
				change24h: s.change24h,
				sparkline: s.sparkline || [],
				updatedAt: s.updatedAt || null,
				gaugeName: s.gaugeName || null,
				primaryGaugeId: s.primaryGaugeId || null,
				latitude: s.latitude,
				longitude: s.longitude,
			});
		}
	}
	return sections;
}

export function transformDetail(data: any): DetailViewModel {
	const { section, river, flow, charts, gauges, reservoirs, snowpack, forecast } = data;

	const designStatus = mapStatusToDesign(flow.status);
	const trend = mapTrend(flow.trend);
	const trendPct = flow.current && flow.change24h
		? Math.round((flow.change24h / flow.current) * 100)
		: 0;

	const primaryGaugeId = section.primaryGaugeId;
	const primarySeries = charts?.[primaryGaugeId] || Object.values(charts || {})[0] || [];
	const history: number[] = primarySeries.map((r: any) => Math.round(r.value));

	let forecastBand: ForecastBandData | null = null;
	let forecastDirection = 'stable';
	if (forecast?.outputs?.length) {
		forecastBand = {
			center: forecast.outputs.map((o: any) => o.flowExpected),
			upper: forecast.outputs.map((o: any) => o.flowMax),
			lower: forecast.outputs.map((o: any) => o.flowMin),
		};
		const first = forecast.outputs[0].flowExpected;
		const last = forecast.outputs[forecast.outputs.length - 1].flowExpected;
		const delta = (last - first) / first;
		if (delta > 0.15) forecastDirection = 'rising';
		else if (delta < -0.15) forecastDirection = 'falling';
		else if (Math.abs(delta) < 0.05) forecastDirection = 'stable';
		else forecastDirection = delta > 0 ? 'rising' : 'falling';
	}

	let snowpackPct: number | null = null;
	if (snowpack?.length) {
		const valid = snowpack.filter((s: any) => s.latest?.swePercentMedian != null);
		if (valid.length) {
			snowpackPct = Math.round(
				valid.reduce((sum: number, s: any) => sum + s.latest.swePercentMedian, 0) / valid.length
			);
		}
	}

	const difficulty = section.difficultyMax && section.difficultyMax !== section.difficultyMin
		? `Class ${section.difficultyMin}–${section.difficultyMax}`
		: section.difficulty ? `Class ${section.difficulty}` : '';

	return {
		id: section.id,
		river: river?.name || '',
		section: section.name,
		classification: difficulty,
		nearestTown: section.putIn || null,
		miles: section.lengthMiles || null,
		notes: section.notes || null,
		now: flow.current,
		status: designStatus,
		statusLabel: STATUS_LABEL[flow.status] || STATUS_LABEL[designStatus],
		trend,
		trendPct,
		updatedAt: flow.timestamp || null,
		thresholds: {
			runnable: section.flowRunnable || 0,
			idealLo: section.flowIdealMin || 0,
			idealHi: section.flowIdealMax || 0,
			high: section.flowHigh || 0,
		},
		history,
		forecastBand,
		forecastDirection,
		snowpackPct,
		damControlled: (reservoirs?.length || 0) > 0,
		gauges: gauges || [],
		reservoirs: reservoirs || [],
		snowpack: snowpack || [],
		forecast: forecast || null,
	};
}
