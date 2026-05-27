// Vite-only mock for Flow-State's browse-only Harper endpoints.
// Lets all read-only pages render (home, watershed, corridor, section) without a running Harper.
// Loaded by vite.config.ts when env MOCK_CORRIDOR_VIEW=1.
//
// Real seed data:
// - RIVERS / WATERSHEDS / CORRIDORS / SECTIONS from lib/seed-data.ts
// - CURATED_ACCESS_POINTS / CURATED_IMPASSABLE_POINTS / CURATED_GAUGES from lib/curated-river-data.ts
//
// Mocked (no DB / ingestion needed):
// - GaugeSnapshot per gauge → plausible currentFlow + trend + sparkline
// - Status / statusLabel via getFlowStatus()
// - flowBands left empty (gracefully falls back to threshold-based status)
//
// Auth + log + craft endpoints stub to safe empty values so authenticated UIs don't crash.

import type { Plugin, ViteDevServer } from 'vite';
import { RIVERS, WATERSHEDS, CORRIDORS, SECTIONS } from '../lib/seed-data.ts';
import { CURATED_ACCESS_POINTS, CURATED_IMPASSABLE_POINTS, CURATED_GAUGES } from '../lib/curated-river-data.ts';
import { getFlowStatus } from '../lib/utils.ts';

// Deterministic, plausible per-gauge mocks. Numbers picked from a typical May
// snowmelt-bump day so the corridor reads realistically across multiple gauges.
const GAUGE_MOCKS: Record<string, { currentFlow: number; trend: 'rising' | 'falling' | 'stable'; change24h: number }> = {
	// Arkansas headwaters
	'usgs-07086000': { currentFlow:  412, trend: 'rising',  change24h:  38 },
	'usgs-07087050': { currentFlow:  587, trend: 'rising',  change24h:  62 },
	'usgs-07091200': { currentFlow:  924, trend: 'rising',  change24h:  85 },
	'usgs-07091500': { currentFlow: 1050, trend: 'rising',  change24h:  74 },
	'usgs-07094500': { currentFlow: 1180, trend: 'stable', change24h:   6 },
	'usgs-07096000': { currentFlow: 1240, trend: 'stable', change24h:  -2 },
	'usgs-07099970': { currentFlow:  220, trend: 'stable', change24h:   0 },
	// Upper Colorado / Eagle / Roaring Fork
	'usgs-09058000': { currentFlow:  680, trend: 'rising',  change24h:  55 },
	'usgs-09060799': { currentFlow:  430, trend: 'rising',  change24h:  30 },
	'usgs-09070500': { currentFlow:  920, trend: 'rising',  change24h:  88 },
	'usgs-09072500': { currentFlow:  760, trend: 'rising',  change24h:  62 },
	'usgs-09085000': { currentFlow: 1450, trend: 'rising',  change24h: 110 },
	// South Platte / Clear Creek / Poudre
	'usgs-06719505': { currentFlow:  320, trend: 'rising',  change24h:  44 },
	'usgs-06752000': { currentFlow:  580, trend: 'rising',  change24h:  60 },
	// Gunnison
	'usgs-09114500': { currentFlow:  590, trend: 'stable', change24h:   5 },
	'usgs-09128000': { currentFlow: 1240, trend: 'rising',  change24h:  95 },
	// Yampa / Green
	'usgs-09251000': { currentFlow: 2200, trend: 'rising',  change24h: 180 },
	// San Juan / Animas / Piedra
	'usgs-09361500': { currentFlow:  780, trend: 'rising',  change24h:  62 },
	// Dolores / San Miguel
	'usgs-09169500': { currentFlow:  420, trend: 'stable', change24h:   8 },
};

// Live USGS discharge, fetched once on dev-server startup so the mock matches reality.
// Restart the dev server to refresh. Falls back to GAUGE_MOCKS for any gauge USGS
// doesn't return (discontinued sites, non-USGS sources, stale readings).
type LiveFlow = { currentFlow: number; trend: 'rising' | 'falling' | 'stable'; change24h: number; updatedAt: string };
let liveFlows: Map<string, LiveFlow> | null = null;
let liveFlowsPromise: Promise<void> | null = null;

async function loadLiveFlows(): Promise<void> {
	const sites = CURATED_GAUGES
		.map(g => g.id.replace(/^usgs-/, ''))
		.filter(s => /^\d{7,9}$/.test(s));
	if (sites.length === 0) { liveFlows = new Map(); return; }
	const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${sites.join(',')}&parameterCd=00060&period=P2D&format=json`;
	const map = new Map<string, LiveFlow>();
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
		const data: any = await res.json();
		const now = Date.now();
		for (const ts of data?.value?.timeSeries ?? []) {
			const site: string = ts.sourceInfo?.siteCode?.[0]?.value;
			const vals: Array<{ value: string; dateTime: string }> = ts.values?.[0]?.value ?? [];
			if (!site || vals.length === 0) continue;
			const latest = vals[vals.length - 1];
			const latestMs = new Date(latest.dateTime).getTime();
			if (now - latestMs > 3 * 24 * 3600_000) continue; // reject stale (discontinued gauges)
			const currentFlow = parseFloat(latest.value);
			if (!isFinite(currentFlow) || currentFlow < 0) continue;
			// Value ~24h before the latest reading → change24h + trend.
			const target = latestMs - 24 * 3600_000;
			let prev = vals[0];
			for (const v of vals) { if (new Date(v.dateTime).getTime() <= target) prev = v; }
			const prevFlow = parseFloat(prev.value);
			const change24h = isFinite(prevFlow) ? Math.round(currentFlow - prevFlow) : 0;
			const trend: LiveFlow['trend'] = change24h > 15 ? 'rising' : change24h < -15 ? 'falling' : 'stable';
			map.set(`usgs-${site}`, { currentFlow: Math.round(currentFlow), trend, change24h, updatedAt: latest.dateTime });
		}
		// eslint-disable-next-line no-console
		console.log(`[mock] loaded live USGS flows for ${map.size}/${sites.length} gauges`);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn('[mock] live USGS fetch failed, using fallback values:', (err as Error).message);
	}
	liveFlows = map;
}

function mockSnapshotFor(gaugeId: string | null | undefined) {
	if (!gaugeId) return null;
	const live = liveFlows?.get(gaugeId);
	if (live) return live;
	const m = GAUGE_MOCKS[gaugeId];
	if (m) return m;
	// Unknown gauge — synthesize from a hash of the id so it stays stable.
	const h = [...gaugeId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
	return { currentFlow: 300 + (h % 1400), trend: 'stable' as const, change24h: ((h % 40) - 20) };
}

function mockSparkline(base: number, len = 30): number[] {
	const out: number[] = [];
	let v = base * 0.7;
	for (let i = 0; i < len; i++) {
		v = v + (base - v) * 0.08 + (Math.sin(i / 3) * base * 0.04) + (Math.cos(i / 1.7) * base * 0.02);
		out.push(Math.max(0, Math.round(v)));
	}
	out[out.length - 1] = base;
	return out;
}

function sectionThresholds(section: any) {
	return {
		low: section.flowLow, runnable: section.flowRunnable,
		idealMin: section.flowIdealMin, idealMax: section.flowIdealMax,
		high: section.flowHigh, expert: section.flowExpert,
		dangerous: section.flowDangerous,
	};
}

function statusOf(section: any, currentFlow: number | null): string {
	if (currentFlow === null) return 'unknown';
	return getFlowStatus(currentFlow, sectionThresholds(section)) ?? 'unknown';
}

// ---- Per-route builders ---------------------------------------------------

function buildCorridorView(corridorId: string) {
	const corridor = CORRIDORS.find(c => c.id === corridorId);
	if (!corridor) return null;
	const watershed = WATERSHEDS.find(w => w.id === corridor.watershedId) ?? null;

	const accessPoints = CURATED_ACCESS_POINTS
		.filter(ap => ap.corridorId === corridorId)
		.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
		.map(ap => ({
			id: ap.id, name: ap.name, altNames: ap.altNames || '', kind: ap.kind,
			sortIndex: ap.sortIndex ?? 0,
			latitude: ap.latitude ?? null, longitude: ap.longitude ?? null,
			riverMile: ap.riverMile ?? null,
			fee: ap.fee ?? null, vehicleAccess: ap.vehicleAccess ?? null,
			notes: ap.notes || '',
		}));

	const impassableDams = CURATED_IMPASSABLE_POINTS
		.filter(d => d.upstreamCorridorId === corridorId || d.downstreamCorridorId === corridorId)
		.map(d => ({
			id: d.id, name: d.name, kind: d.kind,
			upstreamCorridorId: d.upstreamCorridorId ?? null,
			downstreamCorridorId: d.downstreamCorridorId ?? null,
			latitude: d.latitude ?? null, longitude: d.longitude ?? null,
			riverMile: d.riverMile ?? null, notes: d.notes || '',
			position: d.upstreamCorridorId === corridorId ? 'downstream-end'
				: d.downstreamCorridorId === corridorId ? 'upstream-end' : 'unknown',
		}));

	const gauges = CURATED_GAUGES
		.filter(g => g.corridorId === corridorId)
		.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
		.map(g => {
			const m = mockSnapshotFor(g.id);
			return {
				id: g.id, name: g.name, sortIndex: g.sortIndex ?? 0,
				latitude: g.latitude ?? null, longitude: g.longitude ?? null,
				riverMile: g.riverMile ?? null, source: g.source,
				currentFlow: m?.currentFlow ?? null, unit: 'cfs',
				trend: m?.trend ?? 'unknown', change24h: m?.change24h ?? null,
				sparkline: m ? mockSparkline(m.currentFlow) : [],
				updatedAt: new Date().toISOString(),
			};
		});

	const apById = new Map(accessPoints.map(ap => [ap.id, ap]));

	const sections = SECTIONS
		.filter((s: any) => s.corridorId === corridorId)
		.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
		.map((section: any) => {
			const m = mockSnapshotFor(section.primaryGaugeId);
			const currentFlow = m?.currentFlow ?? null;
			const fromAp = section.fromAccessPointId ? apById.get(section.fromAccessPointId) : null;
			const toAp = section.toAccessPointId ? apById.get(section.toAccessPointId) : null;
			return {
				id: section.id, name: section.name, corridorId: section.corridorId,
				parentSectionId: section.parentSectionId ?? null,
				sortIndex: section.sortIndex ?? 0,
				difficulty: section.difficultyMax !== section.difficultyMin
					? `${section.difficultyMin}-${section.difficultyMax}`
					: section.difficultyMin,
				difficultyMin: section.difficultyMin, difficultyMax: section.difficultyMax,
				lengthMiles: section.lengthMiles,
				fromAccessPointId: section.fromAccessPointId ?? null,
				toAccessPointId: section.toAccessPointId ?? null,
				corridorMileSpan: { startMile: fromAp?.riverMile ?? null, endMile: toAp?.riverMile ?? null },
				currentFlow, unit: 'cfs',
				trend: m?.trend ?? 'unknown', change24h: m?.change24h ?? null,
				status: statusOf(section, currentFlow), statusLabel: null,
				primaryGaugeId: section.primaryGaugeId,
				latitude: section.latitude, longitude: section.longitude,
				sparkline: m ? mockSparkline(m.currentFlow) : [],
				updatedAt: new Date().toISOString(),
				gaugeName: null, flowBands: [],
				putIn: section.putIn, takeOut: section.takeOut, notes: section.notes || '',
			};
		});

	const breadcrumb = [
		{ slug: 'colorado', name: 'Colorado', href: '/' },
		...(watershed ? [{ slug: watershed.id, name: watershed.name, href: `/watershed/${watershed.id}` }] : []),
		{ slug: corridor.id, name: corridor.name, href: `/corridor/${corridor.id}` },
	];

	return { corridor, watershed, sections, accessPoints, impassableDams, gauges, weatherSummary: null, breadcrumb };
}

function buildRiverDetail(sectionId: string) {
	const section = SECTIONS.find((s: any) => s.id === sectionId);
	if (!section) return null;
	const corridor = CORRIDORS.find(c => c.id === section.corridorId) ?? null;
	const watershed = corridor ? (WATERSHEDS.find(w => w.id === corridor.watershedId) ?? null) : null;
	const river = RIVERS.find(r => r.id === section.riverId) ?? null;
	const m = mockSnapshotFor(section.primaryGaugeId);
	const currentFlow = m?.currentFlow ?? null;

	// 360 days of synthetic data so the range selector (7/30/90/180/360) has content.
	const now = Date.now();
	const history: { t: number; v: number }[] = [];
	for (let i = 360; i >= 0; i--) {
		const t = now - i * 24 * 3600_000;
		const dayOfYear = ((new Date(t)).getMonth() * 30 + (new Date(t)).getDate()) / 365;
		const seasonal = Math.sin((dayOfYear - 0.4) * Math.PI * 2) * 0.5 + 0.5;
		const v = 200 + seasonal * 2000 + Math.sin(i / 5) * 60;
		history.push({ t, v: Math.max(80, Math.round(v)) });
	}

	return {
		id: section.id,
		section: section.name,
		river: river?.name ?? 'River',
		classification: section.difficultyMin === section.difficultyMax
			? section.difficultyMin
			: `${section.difficultyMin}-${section.difficultyMax}`,
		miles: section.lengthMiles,
		now: currentFlow,
		trend: m?.trend ?? 'unknown',
		trendPct: m ? Math.round((m.change24h / Math.max(1, m.currentFlow)) * 100) : null,
		change24h: m?.change24h ?? null,
		updatedAt: new Date().toISOString(),
		status: statusOf(section, currentFlow),
		statusLabel: null,
		resolvedBand: { description: section.notes || '' },
		thresholds: { idealLo: section.flowIdealMin, idealHi: section.flowIdealMax },
		flowThresholds: sectionThresholds(section),
		history,
		forecastBand: null,
		forecastDirection: 'stable',
		weatherForecast: [],
		snowpackPct: 110,
		damControlled: false,
		snowpack: null,
		reservoirs: [],
		myLogs: [],
		myLogTotalCount: 0,
		notes: section.notes || '',
		nearestTown: null,
		breadcrumb: [
			{ slug: 'colorado', name: 'Colorado', href: '/' },
			...(watershed ? [{ slug: watershed.id, name: watershed.name, href: `/watershed/${watershed.id}` }] : []),
			...(corridor ? [{ slug: corridor.id, name: corridor.name, href: `/corridor/${corridor.id}` }] : []),
			{ slug: section.id, name: section.name, href: `/section/${section.id}` },
		],
	};
}

function buildDashboard() {
	const corridorById = new Map(CORRIDORS.map(c => [c.id, c]));
	const watershedById = new Map(WATERSHEDS.map(w => [w.id, w]));
	const riverWatershedId = new Map(RIVERS.map(r => [r.id, (r as any).watershedId || null]));

	const rivers = RIVERS.map(river => {
		const sectionData = SECTIONS
			.filter((s: any) => s.riverId === river.id)
			.map((section: any) => {
				const m = mockSnapshotFor(section.primaryGaugeId);
				const currentFlow = m?.currentFlow ?? null;
				const corridor = section.corridorId ? corridorById.get(section.corridorId) : null;
				const watershedSlug = corridor?.watershedId || riverWatershedId.get(section.riverId) || null;
				const watershed = watershedSlug ? watershedById.get(watershedSlug) : null;
				return {
					id: section.id, name: section.name,
					difficulty: section.difficultyMax !== section.difficultyMin
						? `${section.difficultyMin}-${section.difficultyMax}`
						: section.difficultyMin,
					lengthMiles: section.lengthMiles,
					currentFlow, unit: 'cfs',
					trend: m?.trend ?? 'unknown',
					change24h: m?.change24h ?? null, change7d: null,
					status: statusOf(section, currentFlow), statusLabel: null,
					primaryGaugeId: section.primaryGaugeId,
					latitude: section.latitude, longitude: section.longitude,
					sparkline: m ? mockSparkline(m.currentFlow) : [],
					updatedAt: new Date().toISOString(),
					gaugeName: null, flowBands: [],
					watershedSlug: watershedSlug || null,
					watershedName: watershed?.name || null,
					corridorSlug: section.corridorId || null,
					corridorName: corridor?.name || null,
					corridorSortIndex: corridor?.sortIndex ?? 999,
					sortIndex: section.sortIndex ?? 999,
					driver: section.driver || corridor?.driver || null,
					myTripCount: 0, lastLoggedAt: null,
					thresholds: {
						flowLow: section.flowLow, flowRunnable: section.flowRunnable,
						flowIdealMin: section.flowIdealMin, flowIdealMax: section.flowIdealMax,
						flowHigh: section.flowHigh, flowExpert: section.flowExpert,
						flowDangerous: section.flowDangerous,
					},
				};
			})
			.sort((a: any, b: any) => {
				const ai = a.corridorSortIndex ?? 999;
				const bi = b.corridorSortIndex ?? 999;
				if (ai !== bi) return ai - bi;
				return (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
			});
		return sectionData.length > 0
			? {
				id: river.id, name: river.name, description: river.description,
				watershedId: (river as any).watershedId || null,
				sections: sectionData,
			}
			: null;
	}).filter(Boolean).sort((a: any, b: any) => a.name.localeCompare(b.name));

	return {
		generated_at: new Date().toISOString(),
		rivers,
		watersheds: WATERSHEDS.map(w => ({
			id: w.id, name: w.name, region: w.region, description: w.description, dominantDriver: w.dominantDriver,
		})),
		corridors: CORRIDORS.map(c => ({
			id: c.id, name: c.name, shortName: c.shortName,
			watershedId: c.watershedId, riverId: c.riverId, driver: c.driver,
		})),
	};
}

function buildCorridorTiles() {
	const riverById = new Map(RIVERS.map(r => [r.id, r]));
	const watershedById = new Map(WATERSHEDS.map(w => [w.id, w]));
	const apById = new Map(CURATED_ACCESS_POINTS.map(ap => [ap.id, ap]));

	const tiles = CORRIDORS.map(corridor => {
		const corridorAps = CURATED_ACCESS_POINTS
			.filter(ap => ap.corridorId === corridor.id)
			.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map(ap => ({
				id: ap.id, name: ap.name, kind: ap.kind, sortIndex: ap.sortIndex ?? 0,
				latitude: ap.latitude ?? null, longitude: ap.longitude ?? null,
				riverMile: ap.riverMile ?? null,
			}));

		const corridorGauges = CURATED_GAUGES
			.filter(g => g.corridorId === corridor.id)
			.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map(g => {
				const m = mockSnapshotFor(g.id);
				return {
					id: g.id, name: g.name, sortIndex: g.sortIndex ?? 0,
					latitude: g.latitude ?? null, longitude: g.longitude ?? null,
					riverMile: g.riverMile ?? null, source: g.source,
					currentFlow: m?.currentFlow ?? null, unit: 'cfs',
					trend: m?.trend ?? 'unknown', change24h: m?.change24h ?? null,
					sparkline: m ? mockSparkline(m.currentFlow) : [],
					updatedAt: new Date().toISOString(),
				};
			});

		const corridorDams = CURATED_IMPASSABLE_POINTS
			.filter(d => d.upstreamCorridorId === corridor.id || d.downstreamCorridorId === corridor.id)
			.map(d => ({
				id: d.id, name: d.name, kind: d.kind,
				position: d.upstreamCorridorId === corridor.id ? 'downstream-end'
					: d.downstreamCorridorId === corridor.id ? 'upstream-end' : 'unknown',
				latitude: d.latitude ?? null, longitude: d.longitude ?? null,
				riverMile: d.riverMile ?? null, notes: d.notes || '',
			}));

		const legs = SECTIONS
			.filter((s: any) => s.corridorId === corridor.id)
			.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map((section: any) => {
				const m = mockSnapshotFor(section.primaryGaugeId);
				const currentFlow = m?.currentFlow ?? null;
				const difficultyLabel = section.difficultyMax && section.difficultyMin && section.difficultyMax !== section.difficultyMin
					? `${section.difficultyMin}–${section.difficultyMax}`
					: (section.difficultyMin || section.difficultyMax || '');
				const fromAp = section.fromAccessPointId ? apById.get(section.fromAccessPointId) : null;
				const toAp = section.toAccessPointId ? apById.get(section.toAccessPointId) : null;
				return {
					sectionId: section.id, name: section.name,
					parentSectionId: section.parentSectionId || null,
					difficultyMin: section.difficultyMin, difficultyMax: section.difficultyMax,
					difficultyLabel, lengthMiles: section.lengthMiles,
					fromAccessPointId: section.fromAccessPointId || null,
					toAccessPointId: section.toAccessPointId || null,
					corridorMileSpan: { startMile: fromAp?.riverMile ?? null, endMile: toAp?.riverMile ?? null },
					sortIndex: section.sortIndex ?? 999,
					status: statusOf(section, currentFlow), statusLabel: null,
					notes: section.notes || '',
					primaryGaugeId: section.primaryGaugeId || null,
					primaryGaugeName: null,
					currentFlow, unit: 'cfs',
					trend: m?.trend ?? 'unknown',
					change24h: m?.change24h ?? null,
					sparkline: m ? mockSparkline(m.currentFlow) : [],
					updatedAt: new Date().toISOString(),
					thresholds: {
						flowLow: section.flowLow, flowRunnable: section.flowRunnable,
						flowIdealMin: section.flowIdealMin, flowIdealMax: section.flowIdealMax,
						flowHigh: section.flowHigh, flowExpert: section.flowExpert,
						flowDangerous: section.flowDangerous,
					},
					myTripCount: 0,
				};
			});

		const river = corridor.riverId ? riverById.get(corridor.riverId) : null;
		const watershed = corridor.watershedId ? watershedById.get(corridor.watershedId) : null;

		return {
			corridorId: corridor.id, name: corridor.name, shortName: corridor.shortName,
			description: corridor.description, driver: corridor.driver,
			sortIndex: corridor.sortIndex ?? 999,
			riverId: corridor.riverId, riverName: river?.name || null,
			watershedId: corridor.watershedId, watershedName: watershed?.name || null,
			accessPoints: corridorAps, legs, gauges: corridorGauges,
			impassableDams: corridorDams,
			myTripCount: 0,
		};
	}).sort((a, b) => {
		const aw = a.watershedName || '';
		const bw = b.watershedName || '';
		if (aw !== bw) return aw.localeCompare(bw);
		return (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
	});

	return { generated_at: new Date().toISOString(), tiles };
}

function buildWatershedView(watershedId: string) {
	const watershed = WATERSHEDS.find(w => w.id === watershedId);
	if (!watershed) return null;
	const corridors = CORRIDORS
		.filter(c => c.watershedId === watershedId)
		.sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
		.map(corridor => {
			const sections = SECTIONS
				.filter((s: any) => s.corridorId === corridor.id)
				.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
				.map((section: any) => {
					const m = mockSnapshotFor(section.primaryGaugeId);
					const currentFlow = m?.currentFlow ?? null;
					return {
						id: section.id, name: section.name,
						parentSectionId: section.parentSectionId ?? null,
						difficulty: section.difficultyMax !== section.difficultyMin
							? `${section.difficultyMin}-${section.difficultyMax}`
							: section.difficultyMin,
						lengthMiles: section.lengthMiles,
						currentFlow, unit: 'cfs',
						trend: m?.trend ?? 'unknown',
						change24h: m?.change24h ?? null,
						status: statusOf(section, currentFlow),
						statusLabel: null,
						sparkline: m ? mockSparkline(m.currentFlow) : [],
						sortIndex: section.sortIndex ?? 999,
					};
				});
			return {
				id: corridor.id, name: corridor.name, shortName: corridor.shortName,
				description: corridor.description, driver: corridor.driver,
				sortIndex: corridor.sortIndex ?? 999,
				sections,
			};
		});
	const breadcrumb = [
		{ slug: 'colorado', name: 'Colorado', href: '/' },
		{ slug: watershed.id, name: watershed.name, href: `/watershed/${watershed.id}` },
	];
	return { watershed, corridors, breadcrumb };
}

// ---- Plugin ---------------------------------------------------------------

function jsonResponse(res: any, body: unknown, status = 200) {
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
}

export function mockCorridorPlugin(): Plugin {
	// Cache the heavy builders so we don't rebuild on every request.
	let cachedDashboard: any = null;
	let cachedCorridorTiles: any = null;
	const cachedCorridorViews = new Map<string, any>();

	// Kick off the live USGS fetch as soon as the plugin loads.
	liveFlowsPromise = loadLiveFlows();

	return {
		name: 'flow-state-mock-corridor',
		configureServer(server: ViteDevServer) {
			server.middlewares.use(async (req, res, next) => {
				const url = (req.url ?? '').split('?')[0];

				// Gauge-flow endpoints must wait for the live USGS fetch so the first
				// response (which gets cached) carries real values, not fallbacks.
				const needsFlows = url === '/Dashboard' || url === '/CorridorTiles'
					|| url.startsWith('/CorridorView/') || url.startsWith('/WatershedView/')
					|| url.startsWith('/RiverDetail/');
				if (needsFlows && liveFlowsPromise) {
					try { await liveFlowsPromise; } catch { /* fall back to GAUGE_MOCKS */ }
				}

				// --- Browse-only Harper endpoints ---

				if (url === '/Dashboard') {
					if (!cachedDashboard) cachedDashboard = buildDashboard();
					return jsonResponse(res, cachedDashboard);
				}

				if (url === '/CorridorTiles') {
					if (!cachedCorridorTiles) cachedCorridorTiles = buildCorridorTiles();
					return jsonResponse(res, cachedCorridorTiles);
				}

				if (url.startsWith('/CorridorView/')) {
					const id = decodeURIComponent(url.replace('/CorridorView/', ''));
					if (!cachedCorridorViews.has(id)) {
						const built = buildCorridorView(id);
						cachedCorridorViews.set(id, built);
					}
					const cv = cachedCorridorViews.get(id);
					if (!cv) return jsonResponse(res, { error: 'Corridor not found' }, 404);
					return jsonResponse(res, cv);
				}

				if (url.startsWith('/WatershedView/')) {
					const id = decodeURIComponent(url.replace('/WatershedView/', ''));
					const wv = buildWatershedView(id);
					if (!wv) return jsonResponse(res, { error: 'Watershed not found' }, 404);
					return jsonResponse(res, wv);
				}

				if (url.startsWith('/RiverDetail/')) {
					const id = decodeURIComponent(url.replace('/RiverDetail/', ''));
					const detail = buildRiverDetail(id);
					if (!detail) return jsonResponse(res, { error: 'Section not found' }, 404);
					return jsonResponse(res, detail);
				}

				// --- Auth / Me ---
				if (url === '/Me') return jsonResponse(res, { authenticated: false, user: null });

				// --- Auth-only or write endpoints: safe empty stubs so pages don't crash ---
				if (url === '/MyLogsView') return jsonResponse(res, { generated_at: new Date().toISOString(), watersheds: [], totalCount: 0 });
				if (url === '/MyConnectionsView') return jsonResponse(res, { connections: [], pendingInbound: [], pendingOutbound: [] });
				if (url.startsWith('/SectionLogsView/')) return jsonResponse(res, { logs: [], totalCount: 0 });
				if (url.startsWith('/RiverLogResource')) return jsonResponse(res, { logs: [], totalCount: 0 });
				if (url.startsWith('/UserCraftResource')) return jsonResponse(res, { crafts: [] });
				if (url === '/RiverSearch' || url.startsWith('/RiverSearch')) return jsonResponse(res, { results: [] });
				if (url.startsWith('/WorldRiverView')) return jsonResponse(res, { rivers: [] });

				// --- Misc Harper machinery (avoid 404 noise) ---
				if (url === '/DataHealth') return jsonResponse(res, { sources: [], healthy: true });
				if (url === '/Ingestion' || url.startsWith('/Ingestion?')) return jsonResponse(res, { lastRuns: [] });
				if (url.startsWith('/IngestionLog')) return jsonResponse(res, { logs: [] });
				if (url.startsWith('/AdminWaitlist') || url.startsWith('/AdminRiverRequests')) return jsonResponse(res, { entries: [] });

				next();
			});
		},
	};
}
