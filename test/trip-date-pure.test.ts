import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	formatDayWithOrdinal,
	formatTripDateLong,
	formatTripDate,
} from '../lib/log/trip-date-pure.ts';

test('formatDayWithOrdinal handles the four standard suffixes', () => {
	assert.equal(formatDayWithOrdinal(1), '1st');
	assert.equal(formatDayWithOrdinal(2), '2nd');
	assert.equal(formatDayWithOrdinal(3), '3rd');
	assert.equal(formatDayWithOrdinal(4), '4th');
});

test('formatDayWithOrdinal handles the teens (always th)', () => {
	for (let d = 11; d <= 13; d++) {
		assert.equal(formatDayWithOrdinal(d), `${d}th`);
	}
});

test('formatDayWithOrdinal handles 21st/22nd/23rd correctly', () => {
	assert.equal(formatDayWithOrdinal(21), '21st');
	assert.equal(formatDayWithOrdinal(22), '22nd');
	assert.equal(formatDayWithOrdinal(23), '23rd');
	assert.equal(formatDayWithOrdinal(24), '24th');
});

test('formatDayWithOrdinal handles 31st', () => {
	assert.equal(formatDayWithOrdinal(31), '31st');
});

test('formatTripDateLong renders Month Day(ordinal), Year', () => {
	assert.equal(formatTripDateLong('2026-05-16'), 'May 16th, 2026');
	assert.equal(formatTripDateLong('2026-12-01'), 'December 1st, 2026');
	assert.equal(formatTripDateLong('2025-07-04'), 'July 4th, 2025');
});

test('formatTripDateLong returns the input unchanged on malformed dates', () => {
	assert.equal(formatTripDateLong(''), '');
	assert.equal(formatTripDateLong('not-a-date'), 'not-a-date');
	assert.equal(formatTripDateLong('2026/05/16'), '2026/05/16');
});

test('formatTripDate single-day returns just the date label', () => {
	const out = formatTripDate('2026-05-16', null, 0);
	assert.equal(out.label, 'May 16th, 2026');
	assert.equal(out.nightsLabel, null);
});

test('formatTripDate single-day when endDate matches start', () => {
	const out = formatTripDate('2026-05-16', '2026-05-16', 0);
	assert.equal(out.label, 'May 16th, 2026');
	assert.equal(out.nightsLabel, null);
});

test('formatTripDate multi-day same-year drops the duplicate year', () => {
	const out = formatTripDate('2026-05-15', '2026-05-17', 2);
	assert.equal(out.label, 'May 15th → May 17th, 2026');
	assert.equal(out.nightsLabel, '2 nights');
});

test('formatTripDate multi-day single night says "1 night"', () => {
	const out = formatTripDate('2026-05-15', '2026-05-16', 1);
	assert.equal(out.label, 'May 15th → May 16th, 2026');
	assert.equal(out.nightsLabel, '1 night');
});

test('formatTripDate multi-day cross-year shows both years', () => {
	const out = formatTripDate('2025-12-30', '2026-01-02', 3);
	assert.equal(out.label, 'December 30th, 2025 → January 2nd, 2026');
	assert.equal(out.nightsLabel, '3 nights');
});

test('formatTripDate falls back to the raw input on parse failure', () => {
	const out = formatTripDate('not-a-date', null, 0);
	assert.equal(out.label, 'not-a-date');
	assert.equal(out.nightsLabel, null);
});
