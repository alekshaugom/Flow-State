import { Resource, tables } from 'harper';
import { RIVERS, SECTIONS, GAUGES, RESERVOIRS, SNOWPACK_BASINS, DATA_SOURCES, FLOW_BANDS, WATERSHEDS, CORRIDORS } from '../lib/seed-data.ts';
import { invalidateFlowBandsCache } from '../lib/flow-bands.ts';
import { invalidateWatershedsCache } from '../lib/watersheds.ts';
import { invalidateCorridorsCache } from '../lib/corridors.ts';
import { invalidateDashboardCache } from './Dashboard.ts';

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
		// Re-upsert rivers/sections so newly-added denormalized fields
		// (watershedId, corridorId, driver) land on existing rows.
		if (backfilled.watersheds || backfilled.corridors) {
			for (const r of RIVERS) await tables.River.put(r.id, r);
			for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
			backfilled.rivers = RIVERS.length;
			backfilled.sections = SECTIONS.length;
		}
	}

	if (Object.keys(backfilled).length === 0) {
		return { backfilled, alreadySeeded: true };
	}
	invalidateWatershedsCache();
	invalidateCorridorsCache();
	invalidateFlowBandsCache();
	invalidateDashboardCache();
	return { backfilled, alreadySeeded: false };
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
	async get() {
		const counts = {
			watersheds: await count(tables.Watershed),
			corridors: await count(tables.RiverCorridor),
			rivers: await count(tables.River),
			sections: await count(tables.RiverSection),
			gauges: await count(tables.Gauge),
			reservoirs: await count(tables.Reservoir),
			basins: await count(tables.SnowpackBasin),
			sources: await count(tables.DataSource),
			flowBands: await count(tables.FlowBand),
		};
		return { seeded: counts.rivers > 0, counts };
	}

	async post(data?: any) {
		const action = data?.action;

		if (action === 'flow-bands') {
			for (const b of FLOW_BANDS) await tables.FlowBand.put(b.id, b);
			invalidateFlowBandsCache();
			invalidateDashboardCache();
			return { ok: true, flowBands: FLOW_BANDS.length, action };
		}

		if (action === 'hierarchy') {
			// Forced idempotent re-seed of the watershed/corridor hierarchy plus
			// the denormalized watershedId / corridorId / driver fields on rivers
			// and sections.
			for (const w of WATERSHEDS) await tables.Watershed.put(w.id, w);
			for (const c of CORRIDORS) await tables.RiverCorridor.put(c.id, c);
			for (const r of RIVERS) await tables.River.put(r.id, r);
			for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
			invalidateWatershedsCache();
			invalidateCorridorsCache();
			invalidateDashboardCache();
			return {
				ok: true,
				action,
				watersheds: WATERSHEDS.length,
				corridors: CORRIDORS.length,
				rivers: RIVERS.length,
				sections: SECTIONS.length,
			};
		}

		const { backfilled, alreadySeeded } = await backfillMissingSeeds();
		if (alreadySeeded) {
			return { ok: true, message: 'Already seeded', skipped: true };
		}
		return { ok: true, message: 'Backfilled missing tables', backfilled };
	}
}
