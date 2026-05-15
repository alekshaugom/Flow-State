import { Resource, tables } from 'harper';
import { RIVERS, SECTIONS, GAUGES, RESERVOIRS, SNOWPACK_BASINS, DATA_SOURCES, FLOW_BANDS, WATERSHEDS, CORRIDORS } from '../lib/seed-data.ts';
import { invalidateFlowBandsCache } from '../lib/flow-bands.ts';
import { invalidateWatershedsCache } from '../lib/watersheds.ts';
import { invalidateCorridorsCache } from '../lib/corridors.ts';
import { invalidateDashboardCache } from './Dashboard.ts';

async function count(table: any): Promise<number> {
	let n = 0;
	for await (const _ of table.search({ conditions: [] })) n++;
	return n;
}

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
			// Idempotent re-seed of the watershed/corridor hierarchy plus the
			// new watershedId / corridorId / driver fields on rivers and sections.
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

		const existing = await count(tables.River);
		if (existing > 0) {
			const flowBandsExisting = await count(tables.FlowBand);
			const watershedsExisting = await count(tables.Watershed);
			const corridorsExisting = await count(tables.RiverCorridor);
			const backfilled: Record<string, number> = {};

			if (flowBandsExisting === 0) {
				for (const b of FLOW_BANDS) await tables.FlowBand.put(b.id, b);
				invalidateFlowBandsCache();
				backfilled.flowBands = FLOW_BANDS.length;
			}
			if (watershedsExisting === 0) {
				for (const w of WATERSHEDS) await tables.Watershed.put(w.id, w);
				invalidateWatershedsCache();
				backfilled.watersheds = WATERSHEDS.length;
			}
			if (corridorsExisting === 0) {
				for (const c of CORRIDORS) await tables.RiverCorridor.put(c.id, c);
				invalidateCorridorsCache();
				backfilled.corridors = CORRIDORS.length;
			}
			// Re-upsert rivers and sections so newly-added watershedId / corridorId
			// / driver fields land on existing rows.
			if (backfilled.watersheds || backfilled.corridors) {
				for (const r of RIVERS) await tables.River.put(r.id, r);
				for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
				backfilled.rivers = RIVERS.length;
				backfilled.sections = SECTIONS.length;
			}

			if (Object.keys(backfilled).length > 0) {
				invalidateDashboardCache();
				return { ok: true, message: 'Backfilled missing tables', backfilled };
			}
			return { ok: true, message: 'Already seeded', skipped: true };
		}

		for (const w of WATERSHEDS) await tables.Watershed.put(w.id, w);
		for (const c of CORRIDORS) await tables.RiverCorridor.put(c.id, c);
		for (const r of RIVERS) await tables.River.put(r.id, r);
		for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
		for (const g of GAUGES) await tables.Gauge.put(g.id, g);
		for (const r of RESERVOIRS) await tables.Reservoir.put(r.id, r);
		for (const b of SNOWPACK_BASINS) await tables.SnowpackBasin.put(b.id, b);
		for (const d of DATA_SOURCES) await tables.DataSource.put(d.id, d);
		for (const b of FLOW_BANDS) await tables.FlowBand.put(b.id, b);

		invalidateWatershedsCache();
		invalidateCorridorsCache();
		invalidateFlowBandsCache();
		invalidateDashboardCache();

		return {
			ok: true,
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
}
