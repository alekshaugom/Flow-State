import { Resource, tables } from 'harper';
import { buildDamFlow } from '../lib/dam-flow.ts';
import { getFlowStatus, daysAgo, isoNow, compositeId } from '../lib/utils.ts';
import { dayOfYearUTC, classifyVsMedian } from '../lib/gauge-rollup-pure.ts';
import { loadBandsForSection, resolveFromCache, bandToDesignStatus, bandToLabel } from '../lib/flow-bands.ts';
import { getCorridorById } from '../lib/corridors.ts';
import { getWatershedById } from '../lib/watersheds.ts';
import { resolveFlowForTrip } from '../lib/log/flow-resolver.ts';
import { shouldRetryFlowResolution } from '../lib/log/flow-resolver-pure.ts';
import { canUserAccessTrip } from '../lib/log/participant-pure.ts';
import { loadParticipantsForTrips } from '../lib/log/participants-loader.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

export function splitIds(ids: string | null | undefined): string[] {
	if (!ids) return [];
	return ids.split(',').map(s => s.trim()).filter(Boolean);
}

// L004 workaround: filtered searches against these tables can return 0 rows
// immediately after a Fabric rolling restart, even though empty-conditions
// scans see the same rows. These tables are small enough (≤ a few hundred rows)
// to cache all rows + filter in-memory. TTL = 60s — short enough to pick up
// fresh ingestion, long enough to avoid hammering on hot endpoints.
const CACHE_TTL_MS = 60_000;

type Cache<T> = { rows: T[]; loadedAt: number };
const _damCache: Cache<any> = { rows: [], loadedAt: 0 };
const _snowCache: Cache<any> = { rows: [], loadedAt: 0 };
const _weatherCache: Cache<any> = { rows: [], loadedAt: 0 };
// Metadata tables — looked up by id. Keyed .get() against these is L004-prone
// (returns null transiently post-restart even when the row exists), so resolve
// them from a cached full-scan + in-memory find, like the reading tables above.
const _basinCache: Cache<any> = { rows: [], loadedAt: 0 };
const _reservoirCache: Cache<any> = { rows: [], loadedAt: 0 };

async function loadAllCached(cache: Cache<any>, table: any): Promise<any[]> {
	if (cache.loadedAt && cache.rows.length > 0 && (Date.now() - cache.loadedAt) < CACHE_TTL_MS) {
		return cache.rows;
	}
	const out: any[] = [];
	for await (const r of table.search({ conditions: [] })) out.push(r);
	// Never cache an empty result — on Fabric post-restart, the first scan can
	// transiently return 0 rows. Caching that for 60s would lock us out until TTL.
	if (out.length > 0) {
		cache.rows = out;
		cache.loadedAt = Date.now();
	}
	return out;
}

async function getFlowData(gaugeIds: string[], days = 360) {
	const cutoff = daysAgo(days).toISOString();
	const series: Record<string, any[]> = {};
	const gaugeList: any[] = [];

	for (const gid of gaugeIds) {
		const gauge = await tables.Gauge.get(gid);
		if (gauge) gaugeList.push(gauge);

		// L004 workaround: a COMPOUND filtered search (gaugeId + timestamp range) against
		// GaugeReading intermittently returns 0 / a stale partial subset after a write batch
		// (backfill) or restart — which empties the discharge chart and corrupts flow.current.
		// A single-attribute (gaugeId) search is reliable, so fetch the gauge's rows that way
		// and filter the time window + sort in memory (~150 rows/gauge — cheap). Mirrors the
		// loadAllCached() approach already used for dam/snow/weather below.
		const raw = await collect(
			tables.GaugeReading.search({
				conditions: [{ attribute: 'gaugeId', value: gid, comparator: 'equals' as const }],
			})
		);
		const readings = raw
			.filter((r: any) => (r.timestamp || '') >= cutoff)
			.sort((a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || ''));
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

export async function getDamReleases(reservoirIds: string[]) {
	const cutoff = daysAgo(14).toISOString();
	const all = await loadAllCached(_damCache, tables.DamRelease);
	const reservoirs = await loadAllCached(_reservoirCache, tables.Reservoir);
	const results: any[] = [];

	for (const rid of reservoirIds) {
		const reservoir = reservoirs.find(r => r.id === rid);
		if (!reservoir) continue;

		const releases = all
			.filter(r => r.reservoirId === rid && (r.timestamp || '') >= cutoff)
			.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

		// The newest daily reservoir row is often provisional with a null
		// outflow (BOR RISE publishes the date before the release value lands),
		// so surface the most recent row that actually has an outflow.
		const latest = releases.find(r => r.outflowCfs != null) || releases[0] || null;

		// When a major diversion sits between the dam and a reach (e.g. the
		// Gunnison Tunnel below Crystal), the gross release never reaches the
		// river — the gauge just below the diversion gives the dam-controlled
		// mainstem that continues downstream. Expose the release → diverted →
		// dam-controlled chain; the section caller adds the reach's own flow +
		// tributary gains (below) to complete the water budget.
		let diversion = null;
		if (reservoir.diversionGaugeId && latest?.outflowCfs != null) {
			const snap = await tables.GaugeSnapshot.get(reservoir.diversionGaugeId).catch(() => null);
			const damControlled = snap?.currentFlow ?? null;
			if (damControlled != null) {
				diversion = {
					name: reservoir.diversionName || 'diversion',
					gaugeId: reservoir.diversionGaugeId,
					grossCfs: Math.round(latest.outflowCfs),
					damControlledCfs: Math.round(damControlled),
					divertedCfs: Math.max(0, Math.round(latest.outflowCfs - damControlled)),
				};
			}
		}

		results.push({
			reservoir,
			latest,
			history: releases.slice(0, 14),
			diversion,
		});
	}
	return results;
}

export async function getSnowpackData(basinIds: string[]) {
	const cutoff = daysAgo(30).toISOString();
	const all = await loadAllCached(_snowCache, tables.SnowpackReading);
	const basins = await loadAllCached(_basinCache, tables.SnowpackBasin);
	const results: any[] = [];

	for (const bid of basinIds) {
		const basin = basins.find(b => b.id === bid);
		if (!basin) continue;

		const readings = all
			.filter(r => r.basinId === bid && (r.timestamp || '') >= cutoff)
			.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

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
	const all = await loadAllCached(_weatherCache, tables.WeatherForecast);
	return all
		.filter(w => w.sectionId === sectionId && (w.date || '') >= todayDate)
		.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
		.slice(0, 14);
}

// Allow other resources (e.g. Ingestion) to invalidate caches after a write batch.
export function invalidateRiverDetailCaches() {
	_damCache.loadedAt = 0;
	_snowCache.loadedAt = 0;
	_weatherCache.loadedAt = 0;
	_basinCache.loadedAt = 0;
	_reservoirCache.loadedAt = 0;
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

async function getRapidsForSection(sectionId: string) {
	const rows: any[] = [];
	for await (const r of (tables as any).Rapid.search({
		conditions: [{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const }],
	})) {
		rows.push({
			id: r.id,
			name: r.name,
			slug: r.slug,
			riverMile: r.riverMile ?? null,
			latitude: r.latitude ?? null,
			longitude: r.longitude ?? null,
			classRating: r.classRating ?? null,
			classByFlowJson: r.classByFlowJson ?? null,
			linesJson: r.linesJson ?? null,
			hazardsJson: r.hazardsJson ?? null,
			scoutPortageNotes: r.scoutPortageNotes ?? null,
			sortIndex: r.sortIndex ?? null,
			lastVerifiedAt: r.lastVerifiedAt ?? null,
			verifiedBy: r.verifiedBy ?? null,
			currentContributionId: r.currentContributionId ?? null,
		});
	}
	// Sort by riverMile, then sortIndex, then name
	rows.sort((a, b) => {
		if (a.riverMile != null && b.riverMile != null) return a.riverMile - b.riverMile;
		if (a.riverMile != null) return -1;
		if (b.riverMile != null) return 1;
		if (a.sortIndex != null && b.sortIndex != null) return a.sortIndex - b.sortIndex;
		return (a.name ?? '').localeCompare(b.name ?? '');
	});
	return rows;
}

async function getMyLogsForSection(userId: string | null, sectionId: string): Promise<{ myLogs: any[]; myLogTotalCount: number }> {
	if (!userId) return { myLogs: [], myLogTotalCount: 0 };
	const rows: any[] = [];
	// Spread out of Harper's read-only proxy so we can patch the in-memory shape after
	// a lazy flow-resolve without hitting "cannot assign to read-only property".
	for await (const p of tables.TripParticipant.search({
		conditions: [{ attribute: 'userId', value: userId, comparator: 'equals' as const }],
	})) {
		if (canUserAccessTrip(p) !== 'accepted') continue;
		const log = await tables.RiverLog.get((p as any).tripId);
		if (!log) continue;
		if ((log as any).sectionId !== sectionId) continue;
		rows.push({ ...(log as any) });
	}

	for (const r of rows) {
		if (r.flowAtTripCfs == null && shouldRetryFlowResolution(r.date)) {
			const flow = await resolveFlowForTrip(sectionId, r.date);
			if (flow) {
				const patch = { flowAtTripCfs: flow.cfs, flowSourceGaugeId: flow.gaugeId, flowResolvedAt: isoNow() };
				await tables.RiverLog.patch(r.id, patch);
				r.flowAtTripCfs = patch.flowAtTripCfs;
				r.flowSourceGaugeId = patch.flowSourceGaugeId;
				r.flowResolvedAt = patch.flowResolvedAt;
			}
		}
	}

	rows.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
	const top = rows.slice(0, 3);
	const participantsByTrip = await loadParticipantsForTrips(tables, top.map((r: any) => r.id), userId);
	const myLogs = top.map((r: any) => ({
		...r,
		participants: participantsByTrip.get(r.id) || [],
	}));
	return { myLogs, myLogTotalCount: rows.length };
}

export class RiverDetail extends Resource {
	allowRead() { return true; }
	async get(target?: any) {
		const sectionId = target?.id;
		if (!sectionId) return new Response('sectionId required in URL path', { status: 400 });

		const section = await tables.RiverSection.get(sectionId);
		if (!section) return new Response('Section not found', { status: 404 });

		const userId = (this.getContext() as any)?.session?.user || null;

		const river = await tables.River.get(section.riverId);
		const corridor = section.corridorId ? await getCorridorById(section.corridorId) : null;
		const watershedId = corridor?.watershedId || (river as any)?.watershedId || null;
		const watershed = watershedId ? await getWatershedById(watershedId) : null;

		const gaugeIds = [section.primaryGaugeId, ...splitIds(section.upstreamGaugeIds), ...splitIds(section.downstreamGaugeIds)].filter(Boolean);
		const reservoirIds = splitIds(section.reservoirIds);
		const basinIds = splitIds(section.snowpackBasinIds);

		const [flowData, damReleases, snowpack, weatherForecast, forecast, flowBands, myLogsData, rapids, allAps, allSections, allOutfitters, allShuttles, weatherCurrentRow, allWeatherHourlySection, allDailyRollups] = await Promise.all([
			getFlowData(gaugeIds),
			getDamReleases(reservoirIds),
			getSnowpackData(basinIds),
			getWeatherForecast(sectionId),
			getLatestForecast(sectionId),
			loadBandsForSection(sectionId),
			getMyLogsForSection(userId, sectionId),
			getRapidsForSection(sectionId),
			collect(tables.AccessPoint.search({ conditions: [] })),
			collect(tables.RiverSection.search({ conditions: [] })),
			collect((tables as any).Outfitter.search({ conditions: [] })),
			collect((tables as any).ShuttleBusiness.search({ conditions: [] })),
			// WeatherCurrent row for this section (id = sectionId)
			(tables as any).WeatherCurrent.get(sectionId).catch(() => null),
			// WeatherHourly rows for this section (L004-safe single-attribute search)
			collect((tables as any).WeatherHourly.search({
				conditions: [{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const }],
			})).catch(() => []),
			// DailyGaugeRollup rows for the primary gauge (single-attribute search)
			section.primaryGaugeId
				? collect(tables.DailyGaugeRollup.search({
					conditions: [{ attribute: 'gaugeId', value: section.primaryGaugeId, comparator: 'equals' as const }],
				})).catch(() => [])
				: Promise.resolve([]),
		]);

		const cid = section.corridorId ?? null;

		const corridorAps = allAps
			.filter((ap: any) => ap.corridorId === cid)
			.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map((ap: any) => ({
				id: ap.id,
				name: ap.name,
				altNames: ap.altNames || '',
				kind: ap.kind,
				sortIndex: ap.sortIndex ?? 0,
				latitude: ap.latitude ?? null,
				longitude: ap.longitude ?? null,
				riverMile: ap.riverMile ?? null,
				fee: ap.fee ?? null,
				vehicleAccess: ap.vehicleAccess ?? null,
				notes: ap.notes || '',
				directions: ap.directions ?? null,
				permitRequired: ap.permitRequired ?? null,
				feeUsd: ap.feeUsd ?? null,
				parkingSpaces: ap.parkingSpaces ?? null,
				lastVerifiedAt: ap.lastVerifiedAt ?? null,
				verifiedBy: ap.verifiedBy ?? null,
				currentContributionId: ap.currentContributionId ?? null,
			}));

		const putIn = corridorAps.find((ap: any) => ap.id === section.fromAccessPointId) ?? null;
		const takeOut = corridorAps.find((ap: any) => ap.id === section.toAccessPointId) ?? null;
		const loMile = Math.min(putIn?.riverMile ?? NaN, takeOut?.riverMile ?? NaN);
		const hiMile = Math.max(putIn?.riverMile ?? NaN, takeOut?.riverMile ?? NaN);
		const alternatives = (Number.isFinite(loMile) && Number.isFinite(hiMile))
			? corridorAps.filter((ap: any) =>
				ap.id !== putIn?.id &&
				ap.id !== takeOut?.id &&
				ap.riverMile != null &&
				ap.riverMile > loMile &&
				ap.riverMile < hiMile
			)
			: [];
		const sectionAccess = { putIn, takeOut, alternatives };

		function servicesCorridor(entity: any): boolean {
			if (!entity.serviceCorridorIds) return false;
			try {
				const ids: string[] = JSON.parse(entity.serviceCorridorIds);
				return Array.isArray(ids) && ids.includes(cid as string);
			} catch {
				return false;
			}
		}

		const outfitters = allOutfitters
			.filter(servicesCorridor)
			.map((o: any) => ({
				id: o.id,
				name: o.name,
				slug: o.slug ?? null,
				licenseNumber: o.licenseNumber ?? null,
				licenseState: o.licenseState ?? null,
				phone: o.phone ?? null,
				website: o.website ?? null,
				serviceCorridorIds: o.serviceCorridorIds ?? null,
				tripTypesJson: o.tripTypesJson ?? null,
				notes: o.notes ?? null,
				lastVerifiedAt: o.lastVerifiedAt ?? null,
				verifiedBy: o.verifiedBy ?? null,
				currentContributionId: o.currentContributionId ?? null,
			}));

		const shuttleBusinesses = allShuttles
			.filter(servicesCorridor)
			.map((s: any) => ({
				id: s.id,
				name: s.name,
				slug: s.slug ?? null,
				phone: s.phone ?? null,
				website: s.website ?? null,
				serviceCorridorIds: s.serviceCorridorIds ?? null,
				ratesJson: s.ratesJson ?? null,
				notes: s.notes ?? null,
				lastVerifiedAt: s.lastVerifiedAt ?? null,
				verifiedBy: s.verifiedBy ?? null,
				currentContributionId: s.currentContributionId ?? null,
			}));

		const siblingSections = allSections
			.filter((s: any) => s.corridorId === cid)
			.sort((a: any, b: any) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
			.map((s: any) => ({
				id: s.id,
				name: s.name,
				sortIndex: s.sortIndex ?? 0,
			}));

		const currentFlow = flowData.latest?.value ?? null;
		const roundedFlow = currentFlow !== null ? Math.round(currentFlow) : null;

		// Section water budget: the reach's own gauge gives its actual flow.
		// Anything above the dam-controlled mainstem (the post-diversion gauge)
		// is tributary/local inflow that rejoins below the diversion. Attach to
		// the dam-release rows so the tile can show release → diverted →
		// dam-controlled + tributary gains = reach total.
		if (roundedFlow != null) {
			for (const dr of damReleases) {
				if (dr.diversion && dr.diversion.damControlledCfs != null) {
					dr.diversion.reachFlowCfs = roundedFlow;
					dr.diversion.tributaryGainCfs = Math.max(0, roundedFlow - dr.diversion.damControlledCfs);
				}
			}
		}

		const damFlow = buildDamFlow({
			entries: damReleases,
			controllingReservoirId: (section as any).controllingReservoirId ?? null,
			reachFlowCfs: roundedFlow,
		});

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

		// WeatherCurrent / WeatherHourly for this section
		const weatherCurrent = weatherCurrentRow ?? null;
		const weatherHourly = (allWeatherHourlySection as any[])
			.sort((a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || ''))
			.slice(0, 12);

		// Historic context: compare today's flow vs. the primary gauge's rollup for today's day-of-year
		let historicContext: any = null;
		const primaryGaugeId = section.primaryGaugeId ?? null;
		if (primaryGaugeId && roundedFlow !== null) {
			const todayDoy = dayOfYearUTC(isoNow());
			const rollup = (allDailyRollups as any[]).find(
				(r: any) => r.gaugeId === primaryGaugeId && r.dayOfYear === todayDoy
			) ?? null;
			if (rollup) {
				const cls = classifyVsMedian(roundedFlow, rollup);
				historicContext = {
					pct: cls.pct,
					word: cls.word,
					percentileApprox: cls.percentileApprox,
					median: rollup.median,
					min: rollup.min,
					max: rollup.max,
					p10: rollup.p10,
					p90: rollup.p90,
					years: rollup.years,
					current: roundedFlow,
				};
			}
		}

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
			damFlow,
			snowpack,
			weatherForecast,
			forecast,
			weatherCurrent,
			weatherHourly,
			historicContext,
			myLogs: myLogsData.myLogs,
			myLogTotalCount: myLogsData.myLogTotalCount,
			rapids,
			gradient: (section as any).gradientFtPerMile ?? null,
			velocity: (section as any).velocityFps ?? null,
			elevationDrop: (section as any).elevationDropFt ?? null,
			outfitters,
			shuttleBusinesses,
			sectionAccess,
			siblingSections,
		};
		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': userId ? 'private, max-age=0, must-revalidate' : 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	}
}
