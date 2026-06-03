import { Resource, tables } from 'harper';
import { RIVERS, SECTIONS, GAUGES, RESERVOIRS, SNOWPACK_BASINS, DATA_SOURCES, FLOW_BANDS, WATERSHEDS, CORRIDORS, ACCESS_POINTS, IMPASSABLE_POINTS, RAPIDS, SHUTTLE_BUSINESSES, OUTFITTERS } from '../lib/seed-data.ts';
import { SECTION_LEG_MAPPING, CURATED_ACCESS_POINTS } from '../lib/curated-river-data.ts';
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

/**
 * Startup sync: fully reconciles live RiverSection and AccessPoint rows with
 * the source-of-truth SECTIONS / SECTION_LEG_MAPPING / CURATED_ACCESS_POINTS.
 * Scoped only to the corridors represented in CURATED_ACCESS_POINTS so we
 * never touch unrelated data. Idempotent — skips rows that already match.
 */
async function syncCuratedSectionsAndAccessPoints(): Promise<{
	sections: { inserted: number; updated: number; deleted: number };
	accessPoints: { inserted: number; updated: number; deleted: number };
}> {
	const sectionStats = { inserted: 0, updated: 0, deleted: 0 };
	const apStats = { inserted: 0, updated: 0, deleted: 0 };

	// --- Derive the set of corridor IDs we are authoritative for ---
	const curatedCorridorIds = new Set(CURATED_ACCESS_POINTS.map(ap => ap.corridorId).filter(Boolean) as string[]);

	// --- Build lookup maps from source-of-truth arrays ---
	const sectionById = new Map(SECTIONS.filter(s => curatedCorridorIds.has(s.corridorId)).map(s => [s.id, s]));
	const legMapping = SECTION_LEG_MAPPING as Record<string, { fromAccessPointId: string; toAccessPointId: string }>;
	const curatedAPById = new Map(CURATED_ACCESS_POINTS.map(ap => [ap.id, ap]));

	// =========================================================
	// SECTIONS — insert / update / delete
	// =========================================================

	// Enumerate all DB sections whose corridorId is in scope
	const dbSectionIds = new Set<string>();
	for await (const row of (tables.RiverSection as any).search({ conditions: [] })) {
		if (curatedCorridorIds.has(row.corridorId)) {
			dbSectionIds.add(row.id);
		}
	}

	// Insert or update each section in the curated set
	for (const [sectionId, s] of sectionById) {
		const leg = legMapping[sectionId];
		const fromAccessPointId = leg?.fromAccessPointId ?? null;
		const toAccessPointId = leg?.toAccessPointId ?? null;

		if (!dbSectionIds.has(sectionId)) {
			// INSERT
			try {
				await (tables.RiverSection as any).put(sectionId, {
					...s,
					fromAccessPointId,
					toAccessPointId,
				});
				sectionStats.inserted++;
			} catch (err) {
				console.warn(`[seed] section insert failed (${sectionId}):`, (err as Error).message);
			}
		} else {
			// UPDATE if anything changed
			let existing: any;
			try {
				existing = await (tables.RiverSection as any).get(sectionId);
			} catch (err) {
				console.warn(`[seed] section get failed (${sectionId}):`, (err as Error).message);
				continue;
			}
			const alreadyMatches =
				existing.fromAccessPointId === fromAccessPointId &&
				existing.toAccessPointId === toAccessPointId &&
				existing.name === s.name &&
				existing.shortName === (s as any).shortName &&
				existing.description === (s as any).description &&
				existing.putIn === s.putIn &&
				existing.takeOut === s.takeOut &&
				existing.lengthMiles === s.lengthMiles &&
				existing.sortIndex === s.sortIndex &&
				existing.latitude === (s as any).latitude &&
				existing.longitude === (s as any).longitude &&
				existing.notes === (s as any).notes;
			if (alreadyMatches) continue;
			try {
				await (tables.RiverSection as any).put(sectionId, {
					...existing,
					fromAccessPointId,
					toAccessPointId,
					name: s.name,
					shortName: (s as any).shortName,
					description: (s as any).description,
					putIn: s.putIn,
					takeOut: s.takeOut,
					lengthMiles: s.lengthMiles,
					sortIndex: s.sortIndex,
					latitude: (s as any).latitude,
					longitude: (s as any).longitude,
					notes: (s as any).notes,
				});
				sectionStats.updated++;
			} catch (err) {
				console.warn(`[seed] section update failed (${sectionId}):`, (err as Error).message);
			}
		}
	}

	// Delete DB sections that are no longer in the curated list
	for (const dbId of dbSectionIds) {
		if (!sectionById.has(dbId)) {
			try {
				await (tables.RiverSection as any).delete(dbId);
				sectionStats.deleted++;
			} catch (err) {
				console.warn(`[seed] section delete failed (${dbId}):`, (err as Error).message);
			}
		}
	}

	// =========================================================
	// ACCESS POINTS — insert / update / delete
	// =========================================================

	// Enumerate all DB access points whose corridorId is in scope
	const dbAPIds = new Set<string>();
	for await (const row of (tables.AccessPoint as any).search({ conditions: [] })) {
		if (curatedCorridorIds.has(row.corridorId)) {
			dbAPIds.add(row.id);
		}
	}

	// Insert or update each access point in the curated set
	for (const [apId, ap] of curatedAPById) {
		if (!dbAPIds.has(apId)) {
			// INSERT
			try {
				await (tables.AccessPoint as any).put(apId, ap);
				apStats.inserted++;
			} catch (err) {
				console.warn(`[seed] access point insert failed (${apId}):`, (err as Error).message);
			}
		} else {
			// UPDATE if anything changed
			let existing: any;
			try {
				existing = await (tables.AccessPoint as any).get(apId);
			} catch (err) {
				console.warn(`[seed] access point get failed (${apId}):`, (err as Error).message);
				continue;
			}
			const alreadyMatches =
				existing.name === ap.name &&
				existing.altNames === ap.altNames &&
				existing.latitude === ap.latitude &&
				existing.longitude === ap.longitude &&
				existing.riverMile === ap.riverMile &&
				existing.kind === ap.kind &&
				existing.sortIndex === ap.sortIndex &&
				existing.fee === ap.fee &&
				existing.vehicleAccess === ap.vehicleAccess &&
				existing.notes === ap.notes;
			if (alreadyMatches) continue;
			try {
				await (tables.AccessPoint as any).put(apId, {
					...existing,
					name: ap.name,
					altNames: ap.altNames,
					latitude: ap.latitude,
					longitude: ap.longitude,
					riverMile: ap.riverMile,
					kind: ap.kind,
					sortIndex: ap.sortIndex,
					fee: ap.fee,
					vehicleAccess: ap.vehicleAccess,
					notes: ap.notes,
				});
				apStats.updated++;
			} catch (err) {
				console.warn(`[seed] access point update failed (${apId}):`, (err as Error).message);
			}
		}
	}

	// Delete DB access points that are no longer in the curated list
	for (const dbId of dbAPIds) {
		if (!curatedAPById.has(dbId)) {
			try {
				await (tables.AccessPoint as any).delete(dbId);
				apStats.deleted++;
			} catch (err) {
				console.warn(`[seed] access point delete failed (${dbId}):`, (err as Error).message);
			}
		}
	}

	return { sections: sectionStats, accessPoints: apStats };
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
	try {
		const { sections, accessPoints } = await syncCuratedSectionsAndAccessPoints();
		console.log(`[seed] startup: sections ${JSON.stringify(sections)}; access points ${JSON.stringify(accessPoints)}`);
	} catch (err) {
		console.warn('[seed] startup curated-sync failed:', (err as Error).message);
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

		if (action === 'bootstrap-admins') {
			const adminEmails = ['aleks@harperdb.io', 'alekshaugom@gmail.com'];
			const patched: string[] = [];
			const skipped: string[] = [];
			for (const email of adminEmails) {
				const rows: any[] = [];
				for await (const r of tables.WaitlistUser.search({
					conditions: [{ attribute: 'email', value: email, comparator: 'equals' as const }],
				})) rows.push(r);
				const user = rows[0];
				if (!user) {
					console.log(`[seed] bootstrap-admins: no user found for ${email}, skipping`);
					skipped.push(email);
				} else {
					await tables.WaitlistUser.patch(user.id, { role: 'superadmin' });
					console.log(`[seed] bootstrap-admins: patched ${email} → superadmin`);
					patched.push(email);
				}
			}
			return { ok: true, action, patched, skipped };
		}

		if (action === 'rapids') {
			// Idempotent upsert of curated rapids into the Rapid table.
			for (const r of RAPIDS) await (tables as any).Rapid.put(r.id, r);
			return { ok: true, action, rapids: RAPIDS.length };
		}

		if (action === 'shuttle-businesses') {
			// Idempotent upsert of shuttle businesses into the ShuttleBusiness table.
			for (const s of SHUTTLE_BUSINESSES) await (tables as any).ShuttleBusiness.put(s.id, s);
			return { ok: true, action, shuttleBusinesses: SHUTTLE_BUSINESSES.length };
		}

		if (action === 'outfitters') {
			// Idempotent upsert of outfitters into the Outfitter table.
			for (const o of OUTFITTERS) await (tables as any).Outfitter.put(o.id, o);
			return { ok: true, action, outfitters: OUTFITTERS.length };
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
