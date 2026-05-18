import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePasswordRules, normalizeEmail, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../lib/auth/password-pure.ts';

test('validatePasswordRules accepts a typical password', () => {
	assert.equal(validatePasswordRules('correct horse battery'), null);
});

test('validatePasswordRules rejects passwords shorter than MIN_PASSWORD_LENGTH', () => {
	for (let i = 0; i < MIN_PASSWORD_LENGTH; i++) {
		const err = validatePasswordRules('a'.repeat(i));
		assert.ok(err);
		assert.equal(err?.status, 400);
	}
});

test('validatePasswordRules accepts a password exactly MIN_PASSWORD_LENGTH long', () => {
	assert.equal(validatePasswordRules('a'.repeat(MIN_PASSWORD_LENGTH)), null);
});

test('validatePasswordRules rejects passwords longer than MAX_PASSWORD_LENGTH', () => {
	const err = validatePasswordRules('a'.repeat(MAX_PASSWORD_LENGTH + 1));
	assert.ok(err);
});

test('validatePasswordRules accepts a password exactly MAX_PASSWORD_LENGTH long', () => {
	assert.equal(validatePasswordRules('a'.repeat(MAX_PASSWORD_LENGTH)), null);
});

test('validatePasswordRules rejects non-strings', () => {
	for (const v of [null, undefined, 123, true, {}, []]) {
		const err = validatePasswordRules(v);
		assert.ok(err, `expected error for ${JSON.stringify(v)}`);
	}
});

test('normalizeEmail trims, lowercases, and validates a basic email', () => {
	assert.equal(normalizeEmail('  Aleks@Example.com  '), 'aleks@example.com');
});

test('normalizeEmail rejects strings without @', () => {
	assert.equal(normalizeEmail('not-an-email'), null);
});

test('normalizeEmail rejects empty / whitespace', () => {
	assert.equal(normalizeEmail(''), null);
	assert.equal(normalizeEmail('   '), null);
});

test('normalizeEmail rejects non-strings', () => {
	assert.equal(normalizeEmail(null), null);
	assert.equal(normalizeEmail(undefined), null);
	assert.equal(normalizeEmail(42), null);
});

test('normalizeEmail rejects emails over 254 chars', () => {
	const local = 'a'.repeat(250);
	const long = `${local}@x.io`;
	assert.equal(normalizeEmail(long), null);
});
