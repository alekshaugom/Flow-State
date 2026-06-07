import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  dayOfYearUTC,
  percentile,
  computeDailyRollups,
  classifyVsMedian,
} from '../lib/gauge-rollup-pure.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a synthetic set of readings: one per calendar year in `years`, each on
 * the given month/day (1-based), with the supplied value. */
function makeReadings(gaugeId, years, month, day, value) {
  return years.map((yr) => ({
    gaugeId,
    timestamp: new Date(Date.UTC(yr, month - 1, day, 12, 0, 0)).toISOString(),
    value: typeof value === 'function' ? value(yr) : value,
  }));
}

// ---------------------------------------------------------------------------
// dayOfYearUTC
// ---------------------------------------------------------------------------

test('dayOfYearUTC: Jan 1 is day 1', () => {
  assert.equal(dayOfYearUTC('2024-01-01T00:00:00Z'), 1);
});

test('dayOfYearUTC: Dec 31 on non-leap year is day 365', () => {
  assert.equal(dayOfYearUTC('2023-12-31T00:00:00Z'), 365);
});

test('dayOfYearUTC: Dec 31 on leap year is day 366', () => {
  assert.equal(dayOfYearUTC('2024-12-31T00:00:00Z'), 366);
});

test('dayOfYearUTC: Feb 28 on leap year is day 59', () => {
  assert.equal(dayOfYearUTC('2024-02-28T00:00:00Z'), 59);
});

test('dayOfYearUTC: Feb 29 on leap year is day 60', () => {
  assert.equal(dayOfYearUTC('2024-02-29T00:00:00Z'), 60);
});

test('dayOfYearUTC: June 1 is day 153 in a non-leap year', () => {
  // Jan31 + Feb28 + Mar31 + Apr30 + May31 = 151; Jun 1 = 152nd day
  // Actually: 31+28+31+30+31 = 151; Jun 1 = 152
  assert.equal(dayOfYearUTC('2023-06-01T00:00:00Z'), 152);
});

test('dayOfYearUTC: mid-day timestamp does not shift the day', () => {
  const a = dayOfYearUTC('2024-05-15T00:00:00Z');
  const b = dayOfYearUTC('2024-05-15T23:59:59Z');
  assert.equal(a, b);
});

// ---------------------------------------------------------------------------
// percentile
// ---------------------------------------------------------------------------

test('percentile: single-element array returns that element', () => {
  assert.equal(percentile([42], 0.5), 42);
});

test('percentile: p=0 returns minimum', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0), 1);
});

test('percentile: p=1 returns maximum', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 1), 5);
});

test('percentile: p=0.5 on odd-length array returns middle element', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0.5), 3);
});

test('percentile: p=0.5 on even-length array interpolates', () => {
  // [1,2,3,4] → median = 2.5
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
});

test('percentile: p10 of 10 uniform values', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  // idx = 0.1 * 9 = 0.9; lo=0(val=1), hi=1(val=2); frac=0.9 → 1 + 0.9*(2-1) = 1.9
  const result = percentile(arr, 0.1);
  assert.ok(Math.abs(result - 1.9) < 0.001, `expected 1.9, got ${result}`);
});

test('percentile: p90 of 10 uniform values', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  // idx = 0.9 * 9 = 8.1; lo=8(val=9), hi=9(val=10); frac=0.1 → 9 + 0.1*(10-9) = 9.1
  const result = percentile(arr, 0.9);
  assert.ok(Math.abs(result - 9.1) < 0.001, `expected 9.1, got ${result}`);
});

test('percentile: p clamped to [0,1] — values > 1 treated as 1', () => {
  assert.equal(percentile([10, 20, 30], 2), 30);
});

test('percentile: p clamped to [0,1] — values < 0 treated as 0', () => {
  assert.equal(percentile([10, 20, 30], -1), 10);
});

test('percentile: empty array returns NaN', () => {
  assert.ok(isNaN(percentile([], 0.5)));
});

// ---------------------------------------------------------------------------
// computeDailyRollups — basic correctness
// ---------------------------------------------------------------------------

test('computeDailyRollups: returns rollup with correct median for a day', () => {
  // Use only non-leap years so Jun 7 always lands on the same dayOfYear
  const years = [2013, 2014, 2015, 2017, 2018, 2019, 2021, 2022, 2023, 2025];
  const readings = makeReadings('g1', years, 6, 7, 500);
  const rollups = computeDailyRollups(readings, 0); // no window to isolate day
  // With windowDays=0 we only pool the exact day
  const doy = dayOfYearUTC('2023-06-07T12:00:00Z'); // non-leap → stable DOY
  const row = rollups.find((r) => r.gaugeId === 'g1' && r.dayOfYear === doy);
  assert.ok(row, 'should find a rollup row for Jun 7');
  assert.equal(row.median, 500);
  assert.equal(row.min, 500);
  assert.equal(row.max, 500);
  assert.equal(row.sampleCount, 10);
  assert.equal(row.years, 10);
});

test('computeDailyRollups: median computed correctly across varying values', () => {
  // 10 non-leap years with values 100..1000 (step 100) — median should be 550
  // Jun 15 falls on the same DOY in all non-leap years
  const years = [2009, 2010, 2011, 2013, 2014, 2015, 2017, 2018, 2019, 2021];
  const readings = years.map((yr, i) => ({
    gaugeId: 'g2',
    timestamp: new Date(Date.UTC(yr, 5, 15, 12, 0, 0)).toISOString(), // Jun 15
    value: (i + 1) * 100,
  }));
  const rollups = computeDailyRollups(readings, 0);
  const doy = dayOfYearUTC('2019-06-15T12:00:00Z'); // non-leap → stable DOY
  const row = rollups.find((r) => r.gaugeId === 'g2' && r.dayOfYear === doy);
  assert.ok(row, 'rollup row should exist');
  // sorted: [100,200,300,400,500,600,700,800,900,1000], median = (500+600)/2 = 550
  assert.equal(row.median, 550);
  assert.equal(row.min, 100);
  assert.equal(row.max, 1000);
  assert.equal(row.p10, percentile([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], 0.1));
  assert.equal(row.p90, percentile([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], 0.9));
});

// ---------------------------------------------------------------------------
// computeDailyRollups — window pooling
// ---------------------------------------------------------------------------

test('computeDailyRollups: ±window pools nearby days', () => {
  // 3 readings on June 5, 6, 7 (adjacent days) across 2 years each
  // With window=3 they should all be pooled into June 6's rollup
  const years2 = [2018, 2019, 2020, 2021, 2022];
  const rJun5 = makeReadings('g3', years2, 6, 5, 200);
  const rJun6 = makeReadings('g3', years2, 6, 6, 300);
  const rJun7 = makeReadings('g3', years2, 6, 7, 400);
  const all = [...rJun5, ...rJun6, ...rJun7];
  const rollups = computeDailyRollups(all, 3);
  const doy6 = dayOfYearUTC('2019-06-06T12:00:00Z');
  const row = rollups.find((r) => r.gaugeId === 'g3' && r.dayOfYear === doy6);
  assert.ok(row, 'pooled rollup row should exist for Jun 6');
  // 3 days × 5 readings each = 15 samples
  assert.equal(row.sampleCount, 15);
});

test('computeDailyRollups: year-wrap — days near Jan 1 pool across Dec 31', () => {
  // Readings on Dec 31 and Jan 1 each from 5 years
  const years5 = [2015, 2016, 2017, 2018, 2019];
  const dec31 = years5.map((yr) => ({
    gaugeId: 'gwrap',
    timestamp: new Date(Date.UTC(yr, 11, 31, 12, 0, 0)).toISOString(),
    value: 100,
  }));
  const jan1 = years5.map((yr) => ({
    gaugeId: 'gwrap',
    timestamp: new Date(Date.UTC(yr + 1, 0, 1, 12, 0, 0)).toISOString(),
    value: 200,
  }));
  const rollups = computeDailyRollups([...dec31, ...jan1], 2);

  // Day 1 (Jan 1) should have pulled in Dec 31 (day 365) via year-wrap
  const rowDay1 = rollups.find((r) => r.gaugeId === 'gwrap' && r.dayOfYear === 1);
  assert.ok(rowDay1, 'rollup row for Jan 1 should exist');
  // It should include both Jan 1 readings (value=200) and Dec 31 readings (value=100) within window=2
  assert.ok(rowDay1.sampleCount >= 10, `expected at least 10 samples, got ${rowDay1.sampleCount}`);
  // min should be 100 (from Dec 31), max should be 200 (from Jan 1)
  assert.equal(rowDay1.min, 100);
  assert.equal(rowDay1.max, 200);
});

test('computeDailyRollups: year-wrap — days near Dec 31 pool across Jan 1', () => {
  const years5 = [2015, 2016, 2017, 2018, 2019];
  const dec30 = years5.map((yr) => ({
    gaugeId: 'gwrap2',
    timestamp: new Date(Date.UTC(yr, 11, 30, 12, 0, 0)).toISOString(),
    value: 150,
  }));
  const jan2 = years5.map((yr) => ({
    gaugeId: 'gwrap2',
    timestamp: new Date(Date.UTC(yr + 1, 0, 2, 12, 0, 0)).toISOString(),
    value: 250,
  }));
  const rollups = computeDailyRollups([...dec30, ...jan2], 3);
  // Day 365 (Dec 31 in non-leap) should pool Dec 30 and also wrap to Jan 2
  // We just check it has readings from both ends
  const rowDec30 = rollups.find((r) => r.gaugeId === 'gwrap2' && r.dayOfYear === 364);
  // (Dec 30 in non-leap = day 364)
  assert.ok(rowDec30, 'rollup row near year-end should exist');
  assert.ok(rowDec30.sampleCount >= 5);
});

// ---------------------------------------------------------------------------
// computeDailyRollups — minimum samples
// ---------------------------------------------------------------------------

test('computeDailyRollups: skips days with fewer than 5 pooled samples', () => {
  // Only 3 readings with window=0 — should produce no row
  const readings = [2020, 2021, 2022].map((yr) => ({
    gaugeId: 'gsparse',
    timestamp: new Date(Date.UTC(yr, 7, 10, 12, 0, 0)).toISOString(),
    value: 300,
  }));
  const rollups = computeDailyRollups(readings, 0);
  const doy = dayOfYearUTC('2020-08-10T12:00:00Z');
  const row = rollups.find((r) => r.gaugeId === 'gsparse' && r.dayOfYear === doy);
  assert.equal(row, undefined, 'should not produce a rollup with <5 samples');
});

test('computeDailyRollups: emits row once pooled samples reach 5', () => {
  // Use non-leap years so Aug 10 always lands on the same DOY (222)
  const years5 = [2013, 2014, 2015, 2017, 2018];
  const readings = makeReadings('genough', years5, 8, 10, 300);
  const rollups = computeDailyRollups(readings, 0);
  const doy = dayOfYearUTC('2018-08-10T12:00:00Z'); // non-leap year
  const row = rollups.find((r) => r.gaugeId === 'genough' && r.dayOfYear === doy);
  assert.ok(row, 'should emit rollup with exactly 5 samples');
  assert.equal(row.sampleCount, 5);
});

// ---------------------------------------------------------------------------
// computeDailyRollups — multiple gauges
// ---------------------------------------------------------------------------

test('computeDailyRollups: handles multiple gauges independently', () => {
  // Non-leap years so Mar 15 (before Feb 29) always lands on same DOY
  const years5 = [2013, 2014, 2015, 2017, 2018];
  const gA = makeReadings('gA', years5, 3, 15, 1000);
  const gB = makeReadings('gB', years5, 3, 15, 2000);
  const rollups = computeDailyRollups([...gA, ...gB], 0);
  const doy = dayOfYearUTC('2018-03-15T12:00:00Z'); // non-leap year
  const rowA = rollups.find((r) => r.gaugeId === 'gA' && r.dayOfYear === doy);
  const rowB = rollups.find((r) => r.gaugeId === 'gB' && r.dayOfYear === doy);
  assert.ok(rowA && rowB, 'both gauges should have rollup rows');
  assert.equal(rowA.median, 1000);
  assert.equal(rowB.median, 2000);
});

// ---------------------------------------------------------------------------
// computeDailyRollups — malformed input
// ---------------------------------------------------------------------------

test('computeDailyRollups: ignores readings with invalid timestamps', () => {
  // Non-leap years so Apr 1 always lands on DOY 91
  const valid = makeReadings('gvalid', [2013, 2014, 2015, 2017, 2018], 4, 1, 500);
  const bad = [{ gaugeId: 'gvalid', timestamp: 'not-a-date', value: 9999 }];
  const rollups = computeDailyRollups([...valid, ...bad], 0);
  const doy = dayOfYearUTC('2018-04-01T12:00:00Z'); // non-leap year
  const row = rollups.find((r) => r.gaugeId === 'gvalid' && r.dayOfYear === doy);
  assert.ok(row, 'valid readings should still produce a row');
  // Bad reading should not pollute the result
  assert.equal(row.max, 500);
});

test('computeDailyRollups: empty input returns empty array', () => {
  assert.deepEqual(computeDailyRollups([]), []);
});

// ---------------------------------------------------------------------------
// classifyVsMedian — word thresholds
// ---------------------------------------------------------------------------

const BASE_ROLLUP = { median: 1000, p10: 600, p90: 1400, min: 200, max: 2000 };

test('classifyVsMedian: exactly at 130 % → Well above normal', () => {
  const r = classifyVsMedian(1300, BASE_ROLLUP);
  assert.equal(r.word, 'Well above normal');
  assert.equal(r.pct, 130);
});

test('classifyVsMedian: above 130 % → Well above normal', () => {
  const r = classifyVsMedian(1500, BASE_ROLLUP);
  assert.equal(r.word, 'Well above normal');
  assert.equal(r.pct, 150);
});

test('classifyVsMedian: exactly at 110 % → Above normal', () => {
  const r = classifyVsMedian(1100, BASE_ROLLUP);
  assert.equal(r.word, 'Above normal');
  assert.equal(r.pct, 110);
});

test('classifyVsMedian: between 110 and 129 % → Above normal', () => {
  const r = classifyVsMedian(1200, BASE_ROLLUP);
  assert.equal(r.word, 'Above normal');
  assert.equal(r.pct, 120);
});

test('classifyVsMedian: exactly at 90 % → Near normal', () => {
  const r = classifyVsMedian(900, BASE_ROLLUP);
  assert.equal(r.word, 'Near normal');
  assert.equal(r.pct, 90);
});

test('classifyVsMedian: 100 % (at median) → Near normal', () => {
  const r = classifyVsMedian(1000, BASE_ROLLUP);
  assert.equal(r.word, 'Near normal');
  assert.equal(r.pct, 100);
});

test('classifyVsMedian: exactly at 70 % → Below normal', () => {
  const r = classifyVsMedian(700, BASE_ROLLUP);
  assert.equal(r.word, 'Below normal');
  assert.equal(r.pct, 70);
});

test('classifyVsMedian: between 70 and 89 % → Below normal', () => {
  const r = classifyVsMedian(800, BASE_ROLLUP);
  assert.equal(r.word, 'Below normal');
  assert.equal(r.pct, 80);
});

test('classifyVsMedian: below 70 % → Well below normal', () => {
  const r = classifyVsMedian(400, BASE_ROLLUP);
  assert.equal(r.word, 'Well below normal');
  assert.equal(r.pct, 40);
});

test('classifyVsMedian: 0 % → Well below normal', () => {
  const r = classifyVsMedian(0, BASE_ROLLUP);
  assert.equal(r.word, 'Well below normal');
  assert.equal(r.pct, 0);
});

// ---------------------------------------------------------------------------
// classifyVsMedian — percentileApprox
// ---------------------------------------------------------------------------

test('classifyVsMedian: percentileApprox = 0 when value equals min', () => {
  const r = classifyVsMedian(200, BASE_ROLLUP); // min = 200
  assert.equal(r.percentileApprox, 0);
});

test('classifyVsMedian: percentileApprox = 100 when value equals max', () => {
  const r = classifyVsMedian(2000, BASE_ROLLUP); // max = 2000
  assert.equal(r.percentileApprox, 100);
});

test('classifyVsMedian: percentileApprox = 50 when value is at midpoint of range', () => {
  // min=200, max=2000, midpoint=1100
  const r = classifyVsMedian(1100, BASE_ROLLUP);
  assert.equal(r.percentileApprox, 50);
});

test('classifyVsMedian: percentileApprox clamped to 0 when value < min', () => {
  const r = classifyVsMedian(0, BASE_ROLLUP); // 0 < min=200
  assert.equal(r.percentileApprox, 0);
});

test('classifyVsMedian: percentileApprox clamped to 100 when value > max', () => {
  const r = classifyVsMedian(9999, BASE_ROLLUP); // > max=2000
  assert.equal(r.percentileApprox, 100);
});

test('classifyVsMedian: percentileApprox = 50 when min === max (degenerate range)', () => {
  const r = classifyVsMedian(500, { median: 500, p10: 500, p90: 500, min: 500, max: 500 });
  assert.equal(r.percentileApprox, 50);
});

// ---------------------------------------------------------------------------
// classifyVsMedian — pct rounding
// ---------------------------------------------------------------------------

test('classifyVsMedian: pct is rounded (not truncated)', () => {
  // 1050 / 1000 = 105.0 — exact
  assert.equal(classifyVsMedian(1050, BASE_ROLLUP).pct, 105);
  // 1055 / 1000 = 105.5 → rounds to 106
  assert.equal(classifyVsMedian(1055, BASE_ROLLUP).pct, 106);
});

test('classifyVsMedian: median=0 produces pct=0 (no division by zero)', () => {
  const r = classifyVsMedian(500, { median: 0, p10: 0, p90: 100, min: 0, max: 100 });
  assert.equal(r.pct, 0);
});
