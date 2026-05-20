import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	validateShareInput,
	isShareValid,
	classifyShare,
	DEFAULT_SHARE_TTL_MINUTES,
} from '../lib/log/share-pure.ts';

test('DEFAULT_SHARE_TTL_MINUTES is 7 days', () => {
	assert.equal(DEFAULT_SHARE_TTL_MINUTES, 7 * 24 * 60);
});

test('validateShareInput requires tripId', () => {
	assert.equal(validateShareInput({ inviteeEmail: 'a@b.com' }).ok, false);
	assert.equal(validateShareInput({ tripId: '', inviteeEmail: 'a@b.com' }).ok, false);
});

test('validateShareInput requires valid inviteeEmail', () => {
	assert.equal(validateShareInput({ tripId: 't1' }).ok, false);
	assert.equal(validateShareInput({ tripId: 't1', inviteeEmail: 'not-an-email' }).ok, false);
	assert.equal(validateShareInput({ tripId: 't1', inviteeEmail: '' }).ok, false);
});

test('validateShareInput normalizes email + trims tripId', () => {
	const out = validateShareInput({ tripId: '  t1  ', inviteeEmail: '  USER@example.com  ' });
	assert.equal(out.ok, true);
	if (out.ok) {
		assert.equal(out.value.tripId, 't1');
		assert.equal(out.value.inviteeEmail, 'user@example.com');
	}
});

test('validateShareInput rejects non-object body', () => {
	assert.equal(validateShareInput(null).ok, false);
	assert.equal(validateShareInput(undefined).ok, false);
	assert.equal(validateShareInput('hello' as any).ok, false);
});

test('isShareValid rejects null', () => {
	assert.equal(isShareValid(null), false);
});

test('isShareValid rejects already-consumed', () => {
	const future = new Date(Date.now() + 60_000).toISOString();
	assert.equal(isShareValid({ usedAt: '2026-05-18T00:00:00.000Z', expiresAt: future }), false);
});

test('isShareValid rejects expired', () => {
	const past = new Date(Date.now() - 60_000).toISOString();
	assert.equal(isShareValid({ usedAt: null, expiresAt: past }), false);
});

test('isShareValid accepts fresh unused', () => {
	const future = new Date(Date.now() + 60_000).toISOString();
	assert.equal(isShareValid({ usedAt: null, expiresAt: future }), true);
});

test('classifyShare returns specific reasons', () => {
	const now = new Date('2026-05-18T12:00:00Z');
	const future = '2026-05-19T12:00:00.000Z';
	const past = '2026-05-17T12:00:00.000Z';
	assert.equal(classifyShare(null, now), 'invalid');
	assert.equal(classifyShare({ usedAt: '2026-05-18T00:00:00.000Z', expiresAt: future }, now), 'consumed');
	assert.equal(classifyShare({ usedAt: null, expiresAt: past }, now), 'expired');
	assert.equal(classifyShare({ usedAt: null, expiresAt: future }, now), 'ok');
});
