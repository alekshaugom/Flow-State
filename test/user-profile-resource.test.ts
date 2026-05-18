import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOwnUserRequest, pickUserProfileWritable, USER_PROFILE_WRITABLE_FIELDS } from '../lib/log/river-log-pure.ts';

test('isOwnUserRequest rejects anonymous request', () => {
	assert.equal(isOwnUserRequest('u1', null), false);
});

test('isOwnUserRequest accepts when requested id matches session user', () => {
	assert.equal(isOwnUserRequest('u1', 'u1'), true);
});

test('isOwnUserRequest rejects cross-user lookup', () => {
	assert.equal(isOwnUserRequest('u2', 'u1'), false);
});

test('isOwnUserRequest defaults to session user when requested id missing', () => {
	assert.equal(isOwnUserRequest(undefined, 'u1'), true);
	assert.equal(isOwnUserRequest(null, 'u1'), true);
	assert.equal(isOwnUserRequest('', 'u1'), true);
});

test('pickUserProfileWritable extracts only profile fields', () => {
	const input = {
		id: 'forged',
		userId: 'forged',
		skillLevel: 'guide',
		yearsBoating: 10,
		background: 'Former raft guide',
		homeWatershedId: 'arkansas',
		preExistingTripCountsJson: '{"arkansas-browns-canyon":200}',
		createdAt: '1970-01-01',
		updatedAt: '1970-01-01',
		notes: 'ignored',
	};
	const out = pickUserProfileWritable(input);
	assert.deepEqual(Object.keys(out).sort(), [
		'background', 'homeWatershedId', 'preExistingTripCountsJson', 'skillLevel', 'yearsBoating',
	]);
});

test('USER_PROFILE_WRITABLE_FIELDS never includes id/userId/createdAt/updatedAt', () => {
	const banned = ['id', 'userId', 'createdAt', 'updatedAt'];
	for (const b of banned) {
		assert.equal((USER_PROFILE_WRITABLE_FIELDS as readonly string[]).includes(b), false, `${b} should not be writable`);
	}
});
