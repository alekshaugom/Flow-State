import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { joinFirstLast, splitName, displayName } from '../lib/auth/user-name-pure.ts';

test('joinFirstLast combines first and last with a single space', () => {
	assert.equal(joinFirstLast('Alice', 'Smith'), 'Alice Smith');
});

test('joinFirstLast trims surrounding whitespace internally', () => {
	assert.equal(joinFirstLast('  Alice  ', '  Smith  '), 'Alice Smith');
});

test('joinFirstLast returns just first when last is missing', () => {
	assert.equal(joinFirstLast('Alice', null), 'Alice');
	assert.equal(joinFirstLast('Alice', undefined), 'Alice');
	assert.equal(joinFirstLast('Alice', ''), 'Alice');
	assert.equal(joinFirstLast('Alice', '   '), 'Alice');
});

test('joinFirstLast returns just last when first is missing', () => {
	assert.equal(joinFirstLast('', 'Smith'), 'Smith');
	assert.equal(joinFirstLast(null, 'Smith'), 'Smith');
});

test('joinFirstLast returns empty string when both are empty', () => {
	assert.equal(joinFirstLast('', ''), '');
	assert.equal(joinFirstLast(null, null), '');
	assert.equal(joinFirstLast(undefined, undefined), '');
});

test('splitName handles a single-word name', () => {
	assert.deepEqual(splitName('Alice'), { firstName: 'Alice', lastName: '' });
});

test('splitName handles two-word name', () => {
	assert.deepEqual(splitName('Alice Smith'), { firstName: 'Alice', lastName: 'Smith' });
});

test('splitName collapses multi-word last names', () => {
	assert.deepEqual(splitName('Alice de la Cruz'), { firstName: 'Alice', lastName: 'de la Cruz' });
});

test('splitName collapses internal whitespace', () => {
	assert.deepEqual(splitName('  Alice    Smith  '), { firstName: 'Alice', lastName: 'Smith' });
});

test('splitName returns blanks for empty input', () => {
	assert.deepEqual(splitName(''), { firstName: '', lastName: '' });
	assert.deepEqual(splitName('   '), { firstName: '', lastName: '' });
	assert.deepEqual(splitName(null), { firstName: '', lastName: '' });
	assert.deepEqual(splitName(undefined), { firstName: '', lastName: '' });
});

test('displayName prefers first/last over name when both present', () => {
	assert.equal(displayName({ name: 'Old Name', firstName: 'Alice', lastName: 'Smith' }), 'Alice Smith');
});

test('displayName falls back to name when first/last are empty', () => {
	assert.equal(displayName({ name: 'Old Name', firstName: '', lastName: '' }), 'Old Name');
	assert.equal(displayName({ name: 'Old Name' }), 'Old Name');
});

test('displayName returns empty string for null user', () => {
	assert.equal(displayName(null), '');
	assert.equal(displayName(undefined), '');
});
