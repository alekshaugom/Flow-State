/**
 * Pure, synchronous computation for daily gauge rollups used by "Historic context".
 *
 * No I/O, no side effects — safe to import in tests and server code alike.
 */

// ---------------------------------------------------------------------------
// dayOfYearUTC
// ---------------------------------------------------------------------------

/**
 * Return the 1-based day-of-year for an ISO timestamp, computed in UTC so that
 * readings from any timezone are bucketed consistently.
 *
 * Examples:
 *   "2024-01-01T00:00:00Z" → 1
 *   "2024-12-31T23:59:59Z" → 366  (2024 is a leap year)
 *   "2023-12-31T00:00:00Z" → 365
 */
export function dayOfYearUTC(iso: string): number {
  const d = new Date(iso);
  // Jan 1 at UTC midnight for that year
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - jan1;
  return Math.floor(ms / 86_400_000) + 1;
}

// ---------------------------------------------------------------------------
// percentile
// ---------------------------------------------------------------------------

/**
 * Compute the p-th percentile of a pre-sorted (ascending) array of numbers
 * using linear interpolation (the same method as NumPy's default).
 *
 * @param sortedAsc - Values sorted in ascending order (must be non-empty).
 * @param p         - Percentile fraction in [0, 1].
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const clampedP = Math.max(0, Math.min(1, p));
  const idx = clampedP * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

// ---------------------------------------------------------------------------
// computeDailyRollups
// ---------------------------------------------------------------------------

export interface GaugeReadingInput {
  gaugeId: string;
  timestamp: string; // ISO string
  value: number;
}

export interface DailyRollupRow {
  gaugeId: string;
  dayOfYear: number;
  median: number;
  p10: number;
  p90: number;
  min: number;
  max: number;
  sampleCount: number;
  years: number;
}

/** Minimum number of pooled readings required to emit a rollup row. */
const MIN_SAMPLES = 5;

/**
 * Group readings by gaugeId, then for each calendar day 1–366 pool all
 * readings whose day-of-year falls within ±windowDays (wrapping across the
 * year boundary) and compute statistical summaries.
 *
 * Days with fewer than MIN_SAMPLES (5) pooled readings are skipped.
 *
 * @param readings    - Raw GaugeReading-shaped objects from the DB.
 * @param windowDays  - Half-width of the smoothing window (default 7).
 */
export function computeDailyRollups(
  readings: GaugeReadingInput[],
  windowDays = 7,
): DailyRollupRow[] {
  // -------------------------------------------------------------------------
  // 1. Group readings by gaugeId, then annotate with dayOfYear + calYear
  // -------------------------------------------------------------------------
  type Annotated = { value: number; day: number; year: number };
  const byGauge = new Map<string, Annotated[]>();

  for (const r of readings) {
    const d = new Date(r.timestamp);
    if (isNaN(d.getTime())) continue;
    const day = dayOfYearUTC(r.timestamp);
    const year = d.getUTCFullYear();
    if (!byGauge.has(r.gaugeId)) byGauge.set(r.gaugeId, []);
    byGauge.get(r.gaugeId)!.push({ value: r.value, day, year });
  }

  // -------------------------------------------------------------------------
  // 2. For each gauge × each calendar day, pool readings within the window
  // -------------------------------------------------------------------------
  const rows: DailyRollupRow[] = [];

  for (const [gaugeId, pts] of byGauge) {
    // Build a lookup: day → [values]
    const valsByDay = new Map<number, number[]>();
    for (const pt of pts) {
      if (!valsByDay.has(pt.day)) valsByDay.set(pt.day, []);
      valsByDay.get(pt.day)!.push(pt.value);
    }

    // We need to know the set of years that have ANY reading for this gauge
    // (used for the "years" count per pooled window).
    // Per-pooled-window we collect distinct calendar years from the pts.
    // Build: day → Set<year>
    const yearsByDay = new Map<number, Set<number>>();
    for (const pt of pts) {
      if (!yearsByDay.has(pt.day)) yearsByDay.set(pt.day, new Set());
      yearsByDay.get(pt.day)!.add(pt.year);
    }

    for (let doy = 1; doy <= 366; doy++) {
      // Collect all readings within ±windowDays, wrapping around 1/366
      const pooledValues: number[] = [];
      const pooledYears = new Set<number>();

      for (let offset = -windowDays; offset <= windowDays; offset++) {
        // Wrap: day arithmetic mod 366, keeping 1-based (1..366)
        let neighbor = ((doy - 1 + offset + 366) % 366) + 1;
        const vals = valsByDay.get(neighbor);
        if (vals) {
          for (const v of vals) pooledValues.push(v);
        }
        const yrs = yearsByDay.get(neighbor);
        if (yrs) {
          for (const y of yrs) pooledYears.add(y);
        }
      }

      if (pooledValues.length < MIN_SAMPLES) continue;

      pooledValues.sort((a, b) => a - b);

      rows.push({
        gaugeId,
        dayOfYear: doy,
        median: percentile(pooledValues, 0.5),
        p10: percentile(pooledValues, 0.1),
        p90: percentile(pooledValues, 0.9),
        min: pooledValues[0],
        max: pooledValues[pooledValues.length - 1],
        sampleCount: pooledValues.length,
        years: pooledYears.size,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// classifyVsMedian
// ---------------------------------------------------------------------------

export interface ClassifyResult {
  /** Rounded percentage of today's flow vs. median (e.g. 145 = 145 % of median). */
  pct: number;
  /** Human-readable classification word. */
  word: string;
  /**
   * Rough linear percentile of currentValue within [min..max] of the rollup,
   * clamped to [0, 100].  (Not a true statistical percentile — just a position
   * estimate for the UI range widget.)
   */
  percentileApprox: number;
}

/**
 * Classify today's gauge reading against the historic rollup for this date.
 *
 * Thresholds (% of median):
 *   ≥ 130 → 'Well above normal'
 *   ≥ 110 → 'Above normal'
 *   ≥  90 → 'Near normal'
 *   ≥  70 → 'Below normal'
 *   < 70  → 'Well below normal'
 */
export function classifyVsMedian(
  currentValue: number,
  rollup: { median: number; p10: number; p90: number; min: number; max: number },
): ClassifyResult {
  const { median, min, max } = rollup;

  const pct = median > 0 ? Math.round((currentValue / median) * 100) : 0;

  let word: string;
  if (pct >= 130) word = 'Well above normal';
  else if (pct >= 110) word = 'Above normal';
  else if (pct >= 90) word = 'Near normal';
  else if (pct >= 70) word = 'Below normal';
  else word = 'Well below normal';

  let percentileApprox: number;
  const range = max - min;
  if (range <= 0) {
    percentileApprox = 50;
  } else {
    percentileApprox = Math.round(
      Math.max(0, Math.min(100, ((currentValue - min) / range) * 100)),
    );
  }

  return { pct, word, percentileApprox };
}
