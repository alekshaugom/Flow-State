import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateVisibility, canInviteParticipants, ALLOWED_VISIBILITY } from '../lib/log/visibility-pure.ts';

test('validateVisibility allows private', () => {
	assert.equal(validateVisibility('private'), null);
});

test('validateVisibility allows participants', () => {
	assert.equal(validateVisibility('participants'), null);
});

test('validateVisibility allows undefined and null', () => {
	assert.equal(validateVisibility(undefined), null);
	assert.equal(validateVisibility(null), null);
});

test('validateVisibility rejects "public" forever', () => {
	const err = validateVisibility('public');
	assert.ok(err);
	assert.equal(err?.status, 400);
});

test('validateVisibility rejects legacy/random values', () => {
	for (const v of ['shared', 'friends', 'unlisted', 'team', '', '   ', 0, 42, {}]) {
		const err = validateVisibility(v as any);
		assert.ok(err, `expected error for ${JSON.stringify(v)}`);
		assert.equal(err?.status, 400);
	}
});

test('canInviteParticipants returns true only for "participants"', () => {
	assert.equal(canInviteParticipants({ visibility: 'participants' }), true);
	assert.equal(canInviteParticipants({ visibility: 'private' }), false);
	assert.equal(canInviteParticipants({ visibility: null }), false);
	assert.equal(canInviteParticipants(null), false);
	assert.equal(canInviteParticipants(undefined), false);
});

test('ALLOWED_VISIBILITY never contains "public"', () => {
	assert.ok(!ALLOWED_VISIBILITY.includes('public' as any));
});
