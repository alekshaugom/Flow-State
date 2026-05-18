import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { pickCfsFromRollupRow, shouldRetryFlowResolution, dayWindowUtc, averageReadings } from '../lib/log/flow-resolver-pure.ts';

test('pickCfsFromRollupRow returns null for missing row', () => {
	assert.equal(pickCfsFromRollupRow(null), null);
	assert.equal(pickCfsFromRollupRow(undefined), null);
});

test('pickCfsFromRollupRow prefers meanCfs', () => {
	assert.equal(pickCfsFromRollupRow({ meanCfs: 396, value: 999 }), 396);
});

test('pickCfsFromRollupRow falls back to value when meanCfs absent', () => {
	assert.equal(pickCfsFromRollupRow({ value: 412 }), 412);
});

test('pickCfsFromRollupRow returns null when neither field is numeric', () => {
	assert.equal(pickCfsFromRollupRow({ meanCfs: 'oops', value: null }), null);
	assert.equal(pickCfsFromRollupRow({}), null);
});

test('pickCfsFromRollupRow returns null for NaN values', () => {
	assert.equal(pickCfsFromRollupRow({ meanCfs: NaN }), null);
	assert.equal(pickCfsFromRollupRow({ value: NaN }), null);
});

test('shouldRetryFlowResolution returns true for any past or same-day trip', () => {
	const now = new Date('2026-05-18T12:00:00Z');
	assert.equal(shouldRetryFlowResolution('2026-05-18', now), true, 'same day');
	assert.equal(shouldRetryFlowResolution('2026-05-15', now), true, '3 days ago');
	assert.equal(shouldRetryFlowResolution('2026-05-11', now), true, '7 days ago');
	assert.equal(shouldRetryFlowResolution('2026-05-10', now), true, '8 days ago');
	assert.equal(shouldRetryFlowResolution('2026-04-01', now), true, 'last month');
	assert.equal(shouldRetryFlowResolution('2020-01-01', now), true, 'years ago');
});

test('shouldRetryFlowResolution returns false for future trips', () => {
	const now = new Date('2026-05-18T12:00:00Z');
	assert.equal(shouldRetryFlowResolution('2026-05-19', now), false, 'tomorrow');
	assert.equal(shouldRetryFlowResolution('2027-01-01', now), false, 'next year');
});

test('shouldRetryFlowResolution returns false for malformed dates', () => {
	assert.equal(shouldRetryFlowResolution('', new Date()), false);
	assert.equal(shouldRetryFlowResolution('not-a-date', new Date()), false);
	assert.equal(shouldRetryFlowResolution('2026/05/16', new Date()), false);
});

test('dayWindowUtc returns ISO start + end one day apart', () => {
	const out = dayWindowUtc('2026-05-16');
	assert.equal(out?.start, '2026-05-16T00:00:00.000Z');
	assert.equal(out?.end, '2026-05-17T00:00:00.000Z');
});

test('dayWindowUtc returns null for malformed input', () => {
	assert.equal(dayWindowUtc(''), null);
	assert.equal(dayWindowUtc('not-a-date'), null);
});

test('averageReadings computes mean of value field', () => {
	assert.equal(averageReadings([{ value: 100 }, { value: 200 }, { value: 300 }]), 200);
});

test('averageReadings skips non-numeric values', () => {
	assert.equal(averageReadings([{ value: 100 }, { value: 'oops' }, { value: 300 }] as any[]), 200);
});

test('averageReadings returns null for empty input', () => {
	assert.equal(averageReadings([]), null);
	assert.equal(averageReadings(null as any), null);
	assert.equal(averageReadings(undefined as any), null);
});

test('averageReadings returns null when all values are non-numeric', () => {
	assert.equal(averageReadings([{ value: null }, { value: 'oops' }, {}] as any[]), null);
});

test('averageReadings handles a single reading', () => {
	assert.equal(averageReadings([{ value: 396 }]), 396);
});
