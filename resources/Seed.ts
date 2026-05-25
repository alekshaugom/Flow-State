import { Resource, tables } from 'harper';
import { RIVERS, SECTIONS, GAUGES, RESERVOIRS, SNOWPACK_BASINS, DATA_SOURCES, FLOW_BANDS, WATERSHEDS, CORRIDORS, ACCESS_POINTS, IMPASSABLE_POINTS } from '../lib/seed-data.ts';
import { invalidateFlowBandsCache } from '../lib/flow-bands.ts';
import { invalidateWatershedsCache } from '../lib/watersheds.ts';
import { invalidateCorridorsCache } from '../lib/corridors.ts';
import { invalidateDashboardCache } from './Dashboard.ts';
import { invalidateCorridorTilesCache } from './CorridorTiles.ts';
import { compositeId } from '../lib/utils.ts';
import { loadWorldRivers } from '../lib/world-rivers.ts';

const AUTO_SEED_FLAG = '__flowStateAutoSeedStarted';
// L004: empty-conditions scan can transiently return 0 rows immediately after
// a rolling restart. Wait a beat before deciding whether tables need seeding.
const AUTO_SEED_STARTUP_DELAY_MS = 10_000;

async function count(table: any): Promise<number> {
	let n = 0;
	for await (const _ of table.search({ conditions: [] })) n++;
	return n;
}

async function fullSeed(): Promise<Record<string, number>> {
	for (const w of WATERSHEDS) await tables.Watershed.put(w.id, w);
	for (const c of CORRIDORS) await tables.RiverCorridor.put(c.id, c);
	for (const r of RIVERS) await tables.River.put(r.id, r);
	for (const ap of ACCESS_POINTS) await tables.AccessPoint.put(ap.id, ap);
	for (const ip of IMPASSABLE_POINTS) await tables.ImpassablePoint.put(ip.id, ip);
	for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
	for (const g of GAUGES) await tables.Gauge.put(g.id, g);
	for (const r of RESERVOIRS) await tables.Reservoir.put(r.id, r);
	for (const b of SNOWPACK_BASINS) await tables.SnowpackBasin.put(b.id, b);
	for (const d of DATA_SOURCES) await tables.DataSource.put(d.id, d);
	for (const b of FLOW_BANDS) await tables.FlowBand.put(b.id, b);
	return {
		watersheds: WATERSHEDS.length,
		corridors: CORRIDORS.length,
		rivers: RIVERS.length,
		sections: SECTIONS.length,
		gauges: GAUGES.length,
		accessPoints: ACCESS_POINTS.length,
		impassablePoints: IMPASSABLE_POINTS.length,
		reservoirs: RESERVOIRS.length,
		basins: SNOWPACK_BASINS.length,
		sources: DATA_SOURCES.length,
		flowBands: FLOW_BANDS.length,
	};
}

/**
 * Idempotent backfill: walks each reference table and seeds only the empty ones.
 * Used by both `POST /Seed` (manual trigger) and the auto-seed-at-startup tick
 * so new tables added in future slices auto-populate on the next Fabric deploy.
 */
async function seedWorldRiversIfEmpty(): Promise<number> {
	const existing = await count(tables.WorldRiver);
	if (existing > 0) return 0;
	const rows = loadWorldRivers();
	if (rows.length === 0) return 0;
	let n = 0;
	for (const row of rows) {
		await tables.WorldRiver.put(row.id, row);
		n++;
	}
	return n;
}

async function backfillMissingSeeds(): Promise<{ backfilled: Record<string, number>; alreadySeeded: boolean }> {
	const riverCount = await count(tables.River);
	const backfilled: Record<string, number> = {};

	if (riverCount === 0) {
		Object.assign(backfilled, await fullSeed());
	} else {
		if ((await count(tables.FlowBand)) === 0) {
			for (const b of FLOW_BANDS) await tables.FlowBand.put(b.id, b);
			backfilled.flowBands = FLOW_BANDS.length;
		}
		if ((await count(tables.Watershed)) === 0) {
			for (const w of WATERSHEDS) await tables.Watershed.put(w.id, w);
			backfilled.watersheds = WATERSHEDS.length;
		}
		if ((await count(tables.RiverCorridor)) === 0) {
			for (const c of CORRIDORS) await tables.RiverCorridor.put(c.id, c);
			backfilled.corridors = CORRIDORS.length;
		}
		if ((await count(tables.AccessPoint)) === 0) {
			for (const ap of ACCESS_POINTS) await tables.AccessPoint.put(ap.id, ap);
			backfilled.accessPoints = ACCESS_POINTS.length;
		}
		if ((await count(tables.ImpassablePoint)) === 0) {
			for (const ip of IMPASSABLE_POINTS) await tables.ImpassablePoint.put(ip.id, ip);
			backfilled.impassablePoints = IMPASSABLE_POINTS.length;
		}
		// Re-upsert rivers/sections/gauges so newly-added denormalized fields
		// (watershedId, corridorId, driver, fromAccessPointId, toAccessPointId,
		// gauge sortIndex) land on existing rows.
		if (backfilled.watersheds || backfilled.corridors || backfilled.accessPoints || backfilled.impassablePoints) {
			for (const r of RIVERS) await tables.River.put(r.id, r);
			for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
			for (const g of GAUGES) await tables.Gauge.put(g.id, g);
			backfilled.rivers = RIVERS.length;
			backfilled.sections = SECTIONS.length;
			backfilled.gauges = GAUGES.length;
		}
	}

	// World rivers — independent table, seeded once when empty.
	const worldSeeded = await seedWorldRiversIfEmpty();
	if (worldSeeded > 0) backfilled.worldRivers = worldSeeded;

	if (Object.keys(backfilled).length === 0) {
		return { backfilled, alreadySeeded: true };
	}
	invalidateWatershedsCache();
	invalidateCorridorsCache();
	invalidateFlowBandsCache();
	invalidateDashboardCache();
	invalidateCorridorTilesCache();
	return { backfilled, alreadySeeded: false };
}

/**
 * Slice 12c migration: every existing RiverLog gets a self-TripParticipant row,
 * and createdByUserId is backfilled from userId. Idempotent — skips logs that
 * already have a participant row. Safe to run on every startup.
 */
async function migrateRiverLogsToParticipants(): Promise<{ logsScanned: number; participantsCreated: number; createdByBackfilled: number }> {
	let logsScanned = 0;
	let participantsCreated = 0;
	let createdByBackfilled = 0;

	for await (const logProxy of tables.RiverLog.search({ conditions: [] })) {
		logsScanned += 1;
		const log = { ...(logProxy as any) };
		const tripId = log.id;
		const userId = log.userId;
		if (!tripId || !userId) continue;

		const participantId = compositeId([tripId, userId]);
		const existing = await tables.TripParticipant.get(participantId);
		if (!existing) {
			const now = log.createdAt || new Date().toISOString();
			const craftSequence = log.craftId
				? [{
					craftId: log.craftId,
					craftType: log.craftType || null,
					craftSize: log.craftSize || null,
					craftName: log.craftName || null,
				}]
				: [];
			await tables.TripParticipant.put({
				id: participantId,
				tripId,
				userId,
				addedBy: userId,
				invitedAt: now,
				acceptedAt: now,
				declinedAt: null,
				removedAt: null,
				notes: log.notes || '',
				notesPrivate: false,
				craftSequenceJson: craftSequence.length ? JSON.stringify(craftSequence) : null,
				craftIds: craftSequence.length ? [craftSequence[0].craftId] : [],
				createdAt: now,
				updatedAt: now,
			});
			participantsCreated += 1;
		}

		if (!log.createdByUserId) {
			await tables.RiverLog.patch(tripId, { createdByUserId: userId });
			createdByBackfilled += 1;
		}
	}

	return { logsScanned, participantsCreated, createdByBackfilled };
}

async function autoSeedAtStartup(): Promise<void> {
	await new Promise(r => setTimeout(r, AUTO_SEED_STARTUP_DELAY_MS));
	try {
		const { backfilled, alreadySeeded } = await backfillMissingSeeds();
		if (alreadySeeded) {
			console.log('[seed] startup: all tables populated, skipping');
		} else {
			console.log(`[seed] startup: backfilled ${JSON.stringify(backfilled)}`);
		}
		const migration = await migrateRiverLogsToParticipants();
		if (migration.participantsCreated > 0 || migration.createdByBackfilled > 0) {
			console.log(`[seed] startup: 12c migration ${JSON.stringify(migration)}`);
		}
	} catch (err) {
		console.warn('[seed] startup auto-seed failed:', (err as Error).message);
	}
}

function startAutoSeed() {
	const g = globalThis as any;
	if (g[AUTO_SEED_FLAG]) return;
	g[AUTO_SEED_FLAG] = true;
	autoSeedAtStartup();
}

startAutoSeed();

export class Seed extends Resource {
	allowRead() { return true; }
	allowCreate() {
		// Open in dev — production should restrict (Fabric runs behind admin auth).
		return process.env.NODE_ENV !== 'production';
	}

	async get() {
		const counts = {
			watersheds: await count(tables.Watershed),
			corridors: await count(tables.RiverCorridor),
			rivers: await count(tables.River),
			sections: await count(tables.RiverSection),
			gauges: await count(tables.Gauge),
			accessPoints: await count(tables.AccessPoint),
			impassablePoints: await count(tables.ImpassablePoint),
			reservoirs: await count(tables.Reservoir),
			basins: await count(tables.SnowpackBasin),
			sources: await count(tables.DataSource),
			flowBands: await count(tables.FlowBand),
			worldRivers: await count(tables.WorldRiver),
		};
		return { seeded: counts.rivers > 0, counts };
	}

	async post(data?: any) {
		const action = data?.action;

		if (action === 'flow-bands') {
			for (const b of FLOW_BANDS) await tables.FlowBand.put(b.id, b);
			invalidateFlowBandsCache();
			invalidateDashboardCache();
			invalidateCorridorTilesCache();
			return { ok: true, flowBands: FLOW_BANDS.length, action };
		}

		if (action === 'world-rivers') {
			// Force re-seed even if non-empty: load file, upsert each.
			const rows = loadWorldRivers();
			for (const row of rows) {
				await tables.WorldRiver.put(row.id, row);
			}
			return { ok: true, action, worldRivers: rows.length };
		}

		if (action === 'hierarchy') {
			// Forced idempotent re-seed of the watershed/corridor hierarchy plus
			// the denormalized watershedId / corridorId / driver fields on rivers
			// and sections, plus AccessPoints and ImpassablePoints from curated data.
			// AccessPoint IDs changed (auto-derived → curated) so clear stale rows
			// before re-adding.
			const curatedApIds = new Set(ACCESS_POINTS.map(a => a.id));
			for await (const row of tables.AccessPoint.search({ conditions: [] })) {
				if (!curatedApIds.has((row as any).id)) {
					await tables.AccessPoint.delete((row as any).id);
				}
			}
			for (const w of WATERSHEDS) await tables.Watershed.put(w.id, w);
			for (const c of CORRIDORS) await tables.RiverCorridor.put(c.id, c);
			for (const ap of ACCESS_POINTS) await tables.AccessPoint.put(ap.id, ap);
			for (const ip of IMPASSABLE_POINTS) await tables.ImpassablePoint.put(ip.id, ip);
			for (const r of RIVERS) await tables.River.put(r.id, r);
			for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
			for (const g of GAUGES) await tables.Gauge.put(g.id, g);
			invalidateWatershedsCache();
			invalidateCorridorsCache();
			invalidateDashboardCache();
			invalidateCorridorTilesCache();
			return {
				ok: true,
				action,
				watersheds: WATERSHEDS.length,
				corridors: CORRIDORS.length,
				rivers: RIVERS.length,
				sections: SECTIONS.length,
				gauges: GAUGES.length,
				accessPoints: ACCESS_POINTS.length,
				impassablePoints: IMPASSABLE_POINTS.length,
			};
		}

		const { backfilled, alreadySeeded } = await backfillMissingSeeds();
		if (alreadySeeded) {
			return { ok: true, message: 'Already seeded', skipped: true };
		}
		return { ok: true, message: 'Backfilled missing tables', backfilled };
	}
}
