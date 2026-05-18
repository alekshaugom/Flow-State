import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	validateCraftType,
	validateCraftName,
	pickUserCraftWritable,
	applyDefaultPromotion,
	pickReplacementDefault,
	denormalizeCraftToLog,
	USER_CRAFT_WRITABLE_FIELDS,
	VALID_CRAFT_TYPES,
} from '../lib/log/user-craft-pure.ts';

test('validateCraftType accepts the three CraftSkillControl values', () => {
	for (const t of VALID_CRAFT_TYPES) {
		assert.equal(validateCraftType(t), null);
	}
});

test('validateCraftType rejects unknown values', () => {
	const err = validateCraftType('canoe');
	assert.ok(err);
	assert.equal(err?.status, 400);
});

test('validateCraftType rejects null / empty', () => {
	assert.ok(validateCraftType(null));
	assert.ok(validateCraftType(undefined));
	assert.ok(validateCraftType(''));
});

test('validateCraftName accepts a valid name', () => {
	assert.equal(validateCraftName('Slipper Pickle'), null);
});

test('validateCraftName trims internally for length check', () => {
	const long = 'a'.repeat(81);
	assert.ok(validateCraftName(long));
	assert.equal(validateCraftName('a'.repeat(80)), null);
});

test('validateCraftName rejects blank / whitespace-only', () => {
	assert.ok(validateCraftName(''));
	assert.ok(validateCraftName('   '));
	assert.ok(validateCraftName('\t\n'));
});

test('validateCraftName rejects non-strings', () => {
	assert.ok(validateCraftName(null));
	assert.ok(validateCraftName(undefined));
	assert.ok(validateCraftName(42));
});

test('pickUserCraftWritable extracts only writable fields', () => {
	const out = pickUserCraftWritable({
		id: 'forged',
		userId: 'forged',
		name: 'Slipper Pickle',
		craftType: 'raft',
		craftSize: '14 ft',
		notes: 'big oar boat',
		isDefault: true,
		archivedAt: '2026-05-18',
		createdAt: '1970-01-01',
		junk: 'nope',
	});
	assert.deepEqual(Object.keys(out).sort(), ['craftSize', 'craftType', 'isDefault', 'name', 'notes']);
});

test('pickUserCraftWritable trims name', () => {
	const out = pickUserCraftWritable({ name: '  Slipper Pickle  ' });
	assert.equal(out.name, 'Slipper Pickle');
});

test('pickUserCraftWritable on non-object returns empty', () => {
	assert.deepEqual(pickUserCraftWritable(null), {});
	assert.deepEqual(pickUserCraftWritable('string'), {});
});

test('USER_CRAFT_WRITABLE_FIELDS does not include auth-sensitive fields', () => {
	const banned = ['id', 'userId', 'archivedAt', 'createdAt', 'updatedAt'];
	for (const b of banned) {
		assert.equal(USER_CRAFT_WRITABLE_FIELDS.includes(b as any), false, `${b} must not be writable`);
	}
});

test('applyDefaultPromotion unsets prior defaults but spares the new one', () => {
	const all = [
		{ id: 'a', isDefault: true },
		{ id: 'b', isDefault: false },
		{ id: 'c', isDefault: true },
	];
	const { toUnset } = applyDefaultPromotion(all, 'b');
	assert.deepEqual(toUnset.sort(), ['a', 'c']);
});

test('applyDefaultPromotion is a no-op when no other defaults exist', () => {
	const all = [
		{ id: 'a', isDefault: false },
		{ id: 'b', isDefault: false },
	];
	const { toUnset } = applyDefaultPromotion(all, 'a');
	assert.deepEqual(toUnset, []);
});

test('applyDefaultPromotion keeps the new id even if it was the only existing default', () => {
	const all = [{ id: 'a', isDefault: true }];
	const { toUnset } = applyDefaultPromotion(all, 'a');
	assert.deepEqual(toUnset, []);
});

test('pickReplacementDefault picks the most recently updated active craft', () => {
	const all = [
		{ id: 'a', updatedAt: '2026-01-01' },
		{ id: 'b', updatedAt: '2026-05-15' },
		{ id: 'c', updatedAt: '2026-03-01' },
	];
	assert.equal(pickReplacementDefault(all, 'a'), 'b');
});

test('pickReplacementDefault skips archived crafts', () => {
	const all = [
		{ id: 'a', updatedAt: '2026-01-01' },
		{ id: 'b', updatedAt: '2026-05-15', archivedAt: '2026-05-16' },
		{ id: 'c', updatedAt: '2026-03-01' },
	];
	assert.equal(pickReplacementDefault(all, 'a'), 'c');
});

test('pickReplacementDefault returns null when no active alternatives', () => {
	const all = [{ id: 'a', updatedAt: '2026-01-01' }];
	assert.equal(pickReplacementDefault(all, 'a'), null);
});

test('denormalizeCraftToLog copies the three display fields', () => {
	assert.deepEqual(
		denormalizeCraftToLog({ name: 'Slipper Pickle', craftType: 'raft', craftSize: '14 ft' }),
		{ craftName: 'Slipper Pickle', craftType: 'raft', craftSize: '14 ft' },
	);
});

test('denormalizeCraftToLog handles missing fields as null', () => {
	assert.deepEqual(
		denormalizeCraftToLog({}),
		{ craftName: null, craftType: null, craftSize: null },
	);
});
