import { tables } from 'harper';
import { pickCfsFromRollupRow, dayWindowUtc, averageReadings, type ResolvedFlow } from './flow-resolver-pure.ts';

export type { ResolvedFlow } from './flow-resolver-pure.ts';

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

async function tryDailyRollup(gaugeId: string, date: string): Promise<number | null> {
	const rollupTable = (tables as any).DailyGaugeRollup;
	if (!rollupTable) return null;
	try {
		const rollupId = `${gaugeId}_${date}`;
		const row = await rollupTable.get(rollupId);
		return pickCfsFromRollupRow(row);
	} catch {
		return null;
	}
}

async function averageGaugeReadingsForDay(gaugeId: string, date: string): Promise<number | null> {
	const window = dayWindowUtc(date);
	if (!window) return null;
	try {
		// Harper's filtered search doesn't reliably combine two conditions on the
		// same attribute (gte AND lt on `timestamp`). Pull from gte the day's start
		// and stop scanning once we cross the day boundary.
		const dayRows: any[] = [];
		for await (const r of tables.GaugeReading.search({
			conditions: [
				{ attribute: 'gaugeId', value: gaugeId, comparator: 'equals' as const },
				{ attribute: 'timestamp', value: window.start, comparator: 'gte' as const },
			],
			sort: { attribute: 'timestamp', descending: false },
		})) {
			const ts = (r as any).timestamp;
			if (typeof ts === 'string' && ts >= window.end) break;
			dayRows.push(r);
		}
		return averageReadings(dayRows);
	} catch {
		return null;
	}
}

export async function resolveFlowForTrip(sectionId: string, date: string): Promise<ResolvedFlow | null> {
	const section = await tables.RiverSection.get(sectionId);
	if (!section || !(section as any).primaryGaugeId) return null;
	const gaugeId = (section as any).primaryGaugeId as string;

	// Preferred: the daily rollup (slice 03b). Cheap when present, returns null
	// when missing — the table doesn't even exist locally yet.
	const rollupCfs = await tryDailyRollup(gaugeId, date);
	if (rollupCfs != null) return { cfs: rollupCfs, gaugeId };

	// Fallback: average the raw `GaugeReading` rows for the UTC day window of the
	// trip's start date. Works for any historical date we have data for.
	const avg = await averageGaugeReadingsForDay(gaugeId, date);
	if (avg != null) return { cfs: Math.round(avg), gaugeId };

	return null;
}
