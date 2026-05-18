import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	validateTtlMinutes,
	computeExpiresAt,
	isExpired,
	isConsumed,
	DEFAULT_TOKEN_TTL_MINUTES,
	MIN_TOKEN_TTL_MINUTES,
	MAX_TOKEN_TTL_MINUTES,
} from '../lib/auth/token-pure.ts';

test('validateTtlMinutes accepts no input and falls back to default', () => {
	const out = validateTtlMinutes(undefined);
	assert.equal(out.ok, true);
	if (out.ok) assert.equal(out.minutes, DEFAULT_TOKEN_TTL_MINUTES);
});

test('validateTtlMinutes accepts a value within bounds', () => {
	const out = validateTtlMinutes(60);
	assert.equal(out.ok, true);
	if (out.ok) assert.equal(out.minutes, 60);
});

test('validateTtlMinutes accepts MIN and MAX bounds exactly', () => {
	const lo = validateTtlMinutes(MIN_TOKEN_TTL_MINUTES);
	const hi = validateTtlMinutes(MAX_TOKEN_TTL_MINUTES);
	assert.equal(lo.ok, true);
	assert.equal(hi.ok, true);
});

test('validateTtlMinutes rejects values below MIN', () => {
	const out = validateTtlMinutes(MIN_TOKEN_TTL_MINUTES - 1);
	assert.equal(out.ok, false);
});

test('validateTtlMinutes rejects values above MAX', () => {
	const out = validateTtlMinutes(MAX_TOKEN_TTL_MINUTES + 1);
	assert.equal(out.ok, false);
});

test('validateTtlMinutes rejects zero, negatives, and non-integers', () => {
	for (const v of [0, -1, -100, 1.5, 'twenty', null, true, NaN, Infinity]) {
		const out = validateTtlMinutes(v as any);
		// null/undefined fall back to default; the others should fail.
		if (v == null) {
			assert.equal(out.ok, true, `unexpected fail for ${String(v)}`);
		} else {
			assert.equal(out.ok, false, `should have failed for ${String(v)}`);
		}
	}
});

test('computeExpiresAt produces an ISO string at the expected offset', () => {
	const now = new Date('2026-05-18T12:00:00Z');
	const out = computeExpiresAt(now, 60);
	assert.equal(out, '2026-05-18T13:00:00.000Z');
});

test('isExpired returns true for past times', () => {
	const past = new Date(Date.now() - 1000).toISOString();
	assert.equal(isExpired(past, new Date()), true);
});

test('isExpired returns false for future times', () => {
	const future = new Date(Date.now() + 60_000).toISOString();
	assert.equal(isExpired(future, new Date()), false);
});

test('isExpired returns true for null/undefined/empty/invalid', () => {
	assert.equal(isExpired(null), true);
	assert.equal(isExpired(undefined), true);
	assert.equal(isExpired(''), true);
	assert.equal(isExpired('not-a-date'), true);
});

test('isExpired returns true at exactly the expiration time', () => {
	const now = new Date('2026-05-18T12:00:00Z');
	assert.equal(isExpired('2026-05-18T12:00:00.000Z', now), true);
});

test('isConsumed returns true only when usedAt is a non-empty string', () => {
	assert.equal(isConsumed('2026-05-18T12:00:00.000Z'), true);
	assert.equal(isConsumed(null), false);
	assert.equal(isConsumed(undefined), false);
	assert.equal(isConsumed(''), false);
});
