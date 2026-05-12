import { Resource, tables } from 'harper';
import { RIVERS, SECTIONS, GAUGES, RESERVOIRS, SNOWPACK_BASINS, DATA_SOURCES } from '../lib/seed-data.ts';

async function count(table: any): Promise<number> {
	let n = 0;
	for await (const _ of table.search({ conditions: [] })) n++;
	return n;
}

export class Seed extends Resource {
	async get() {
		const counts = {
			rivers: await count(tables.River),
			sections: await count(tables.RiverSection),
			gauges: await count(tables.Gauge),
			reservoirs: await count(tables.Reservoir),
			basins: await count(tables.SnowpackBasin),
			sources: await count(tables.DataSource),
		};
		return { seeded: counts.rivers > 0, counts };
	}

	async post() {
		const existing = await count(tables.River);
		if (existing > 0) return { ok: true, message: 'Already seeded', skipped: true };

		for (const r of RIVERS) await tables.River.put(r.id, r);
		for (const s of SECTIONS) await tables.RiverSection.put(s.id, s);
		for (const g of GAUGES) await tables.Gauge.put(g.id, g);
		for (const r of RESERVOIRS) await tables.Reservoir.put(r.id, r);
		for (const b of SNOWPACK_BASINS) await tables.SnowpackBasin.put(b.id, b);
		for (const d of DATA_SOURCES) await tables.DataSource.put(d.id, d);

		return {
			ok: true,
			rivers: RIVERS.length,
			sections: SECTIONS.length,
			gauges: GAUGES.length,
			reservoirs: RESERVOIRS.length,
			basins: SNOWPACK_BASINS.length,
			sources: DATA_SOURCES.length,
		};
	}
}
