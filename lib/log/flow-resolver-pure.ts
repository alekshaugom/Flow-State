export interface ResolvedFlow {
	cfs: number;
	gaugeId: string;
}

export function pickCfsFromRollupRow(row: any): number | null {
	if (!row) return null;
	if (typeof row.meanCfs === 'number' && !isNaN(row.meanCfs)) return row.meanCfs;
	if (typeof row.value === 'number' && !isNaN(row.value)) return row.value;
	return null;
}

/**
 * Resolve attempts run on read whenever a log's `flowAtTripCfs` is null and the
 * trip is in the past (or today). We used to cap retries at 7 days post-trip
 * back when `DailyGaugeRollup` was the only data source and we worried about
 * it taking time to populate. With the `GaugeReading` fallback (slice 12l)
 * we can resolve any historical date as long as we have readings for it,
 * so the cap is gone. Future-dated trips still skip because we don't have
 * data yet.
 */
export function shouldRetryFlowResolution(tripDate: string, now: Date = new Date()): boolean {
	if (!tripDate || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) return false;
	const tripMs = Date.parse(tripDate + 'T00:00:00Z');
	if (isNaN(tripMs)) return false;
	const todayMs = Date.parse(now.toISOString().slice(0, 10) + 'T00:00:00Z');
	return tripMs <= todayMs;
}

export function dayWindowUtc(yyyymmdd: string): { start: string; end: string } | null {
	if (typeof yyyymmdd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return null;
	const startMs = Date.parse(yyyymmdd + 'T00:00:00Z');
	if (isNaN(startMs)) return null;
	const endMs = startMs + 86_400_000;
	return {
		start: new Date(startMs).toISOString(),
		end: new Date(endMs).toISOString(),
	};
}

/** Mean of `row.value` across readings, skipping non-numeric values. Null if zero numeric readings. */
export function averageReadings(rows: Array<{ value?: any }>): number | null {
	if (!rows || rows.length === 0) return null;
	let sum = 0;
	let count = 0;
	for (const r of rows) {
		const v = r?.value;
		if (typeof v === 'number' && !isNaN(v)) {
			sum += v;
			count += 1;
		}
	}
	if (count === 0) return null;
	return sum / count;
}
