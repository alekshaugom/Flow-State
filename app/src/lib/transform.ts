import { mapStatusToDesign, mapTrend, STATUS_LABEL } from '../constants';
import type { DashboardSection, DetailViewModel, ForecastBandData, ApiDashboardResponse } from '../types';
import {
	resolveBandClient, bandToDesignStatus, bandToLabel,
	type CraftType, type SkillLevel, type ResolvedBand,
} from './craftTypes';

export function transformDashboard(
	data: ApiDashboardResponse,
	craft: CraftType = 'raft',
	skill: SkillLevel = 'intermediate',
): DashboardSection[] {
	const sections: DashboardSection[] = [];
	for (const river of data.rivers) {
		for (const s of river.sections) {
			// Resolve band locally so the dashboard reflects the global craft/skill.
			// Falls back to server-provided status if no bands match.
			const bands = s.flowBands || [];
			const resolved = resolveBandClient(bands, craft, skill, s.currentFlow);

			const apiStatus = resolved ? bandToDesignStatus(resolved.bandName) : s.status;
			const designStatus = mapStatusToDesign(apiStatus);
			const label = resolved ? bandToLabel(resolved.bandName)
				: (s.statusLabel || STATUS_LABEL[s.status] || STATUS_LABEL[designStatus]);

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
				statusLabel: label,
				trend,
				trendPct,
				change24h: s.change24h,
				sparkline: s.sparkline || [],
				updatedAt: s.updatedAt || null,
				gaugeName: s.gaugeName || null,
				primaryGaugeId: s.primaryGaugeId || null,
				latitude: s.latitude,
				longitude: s.longitude,
				flowBands: bands,
				watershedSlug: s.watershedSlug || null,
				watershedName: s.watershedName || null,
				corridorSlug: s.corridorSlug || null,
				corridorName: s.corridorName || null,
				corridorSortIndex: s.corridorSortIndex ?? null,
				sortIndex: s.sortIndex ?? null,
				driver: s.driver || null,
				myTripCount: s.myTripCount ?? 0,
				lastLoggedAt: s.lastLoggedAt ?? null,
				legacyThresholds: s.thresholds || null,
			});
		}
	}
	return sections;
}

export function transformDetail(
	data: any,
	craft: CraftType = 'raft',
	skill: SkillLevel = 'intermediate',
): DetailViewModel {
	const { section, river, flow, charts, gauges, reservoirs, snowpack, weatherForecast, forecast, flowBands, resolvedBand: serverBand, breadcrumb, myLogs, myLogTotalCount } = data;

	// Re-resolve the band client-side based on the global craft/skill context.
	// Falls back to the server-resolved band (default raft+intermediate or legacy).
	const localResolved = resolveBandClient(flowBands || [], craft, skill, flow.current);
	const resolvedBand: ResolvedBand | null = localResolved || serverBand || null;

	const apiStatus = resolvedBand ? bandToDesignStatus(resolvedBand.bandName) : flow.status;
	const designStatus = mapStatusToDesign(apiStatus);
	const statusLabelComputed = resolvedBand
		? bandToLabel(resolvedBand.bandName)
		: (flow.statusLabel || STATUS_LABEL[flow.status] || STATUS_LABEL[designStatus]);

	const trend = mapTrend(flow.trend);
	const trendPct = flow.current && flow.change24h
		? Math.round((flow.change24h / flow.current) * 100)
		: 0;

	const primaryGaugeId = section.primaryGaugeId;
	const primarySeries = charts?.[primaryGaugeId] || Object.values(charts || {})[0] || [];
	const history = primarySeries.map((r: any) => ({ t: new Date(r.timestamp).getTime(), v: Math.round(r.value) }));

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
		putIn: section.putIn || null,
		takeOut: section.takeOut || null,
		miles: section.lengthMiles || null,
		notes: section.notes || null,
		breadcrumb: Array.isArray(breadcrumb) ? breadcrumb : [],
		now: flow.current,
		status: designStatus,
		statusLabel: statusLabelComputed,
		trend,
		trendPct,
		updatedAt: flow.timestamp || null,
		thresholds: {
			runnable: section.flowRunnable || 0,
			idealLo: section.flowIdealMin || 0,
			idealHi: section.flowIdealMax || 0,
			high: section.flowHigh || 0,
		},
		flowThresholds: section ? {
			flowLow: section.flowLow ?? 0,
			flowRunnable: section.flowRunnable ?? 0,
			flowIdealMin: section.flowIdealMin ?? 0,
			flowIdealMax: section.flowIdealMax ?? 0,
			flowHigh: section.flowHigh ?? 0,
			flowExpert: section.flowExpert ?? 0,
			flowDangerous: section.flowDangerous ?? 0,
		} : null,
		history,
		forecastBand,
		forecastDirection,
		snowpackPct,
		damControlled: (reservoirs?.length || 0) > 0,
		gauges: gauges || [],
		reservoirs: reservoirs || [],
		snowpack: snowpack || [],
		weatherForecast: weatherForecast || [],
		forecast: forecast || null,
		flowBands: flowBands || [],
		resolvedBand,
		myLogs: myLogs || [],
		myLogTotalCount: myLogTotalCount ?? 0,
	};
}
