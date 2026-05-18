import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	pickWritable,
	validateOwnership,
	WRITABLE_FIELDS,
} from '../lib/log/river-log-pure.ts';

test('pickWritable extracts only whitelisted fields', () => {
	const input = {
		userId: 'someone-else',
		id: 'forged-id',
		visibility: 'public',
		watershedId: 'forged-watershed',
		craftType: 'oar-raft',
		notes: 'good run',
		date: '2026-05-16',
	};
	const out = pickWritable(input);
	assert.deepEqual(Object.keys(out).sort(), ['craftType', 'date', 'notes']);
	assert.equal((out as any).userId, undefined);
	assert.equal((out as any).visibility, undefined);
	assert.equal((out as any).watershedId, undefined);
	assert.equal((out as any).id, undefined);
});

test('pickWritable ignores undefined but keeps null and falsy values', () => {
	const out = pickWritable({ craftType: null, notes: '', crewSize: 0, craftSize: undefined });
	assert.equal(out.craftType, null);
	assert.equal(out.notes, '');
	assert.equal(out.crewSize, 0);
	assert.equal('craftSize' in out, false);
});

test('pickWritable on non-object returns empty', () => {
	assert.deepEqual(pickWritable(null), {});
	assert.deepEqual(pickWritable(undefined), {});
	assert.deepEqual(pickWritable('string'), {});
});

test('WRITABLE_FIELDS does not include any auth-sensitive fields', () => {
	const banned = ['userId', 'id', 'visibility', 'watershedId', 'corridorId', 'createdAt', 'updatedAt', 'flowAtTripCfs', 'flowSourceGaugeId', 'flowResolvedAt'];
	for (const b of banned) {
		assert.equal((WRITABLE_FIELDS as readonly string[]).includes(b), false, `${b} should not be writable through patch`);
	}
});

test('validateOwnership returns "not-found" when record missing', () => {
	assert.equal(validateOwnership(null, 'u1'), 'not-found');
	assert.equal(validateOwnership(undefined, 'u1'), 'not-found');
});

test('validateOwnership returns "forbidden" when no current user', () => {
	assert.equal(validateOwnership({ userId: 'u1' }, null), 'forbidden');
});

test('validateOwnership returns "forbidden" when record belongs to another user', () => {
	assert.equal(validateOwnership({ userId: 'u1' }, 'u2'), 'forbidden');
});

test('validateOwnership returns "ok" when current user owns the record', () => {
	assert.equal(validateOwnership({ userId: 'u1' }, 'u1'), 'ok');
});
