import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { hashPassword, verifyPassword, PASSWORD_ALGO } from '../lib/auth/password.ts';
import { mintLoginToken } from '../lib/auth/token.ts';

test('hashPassword produces hex-encoded hash + salt with algo tag', async () => {
	const out = await hashPassword('correct horse battery');
	assert.equal(out.algo, PASSWORD_ALGO);
	assert.match(out.hash, /^[0-9a-f]+$/);
	assert.match(out.salt, /^[0-9a-f]+$/);
	assert.equal(out.hash.length, 128, 'KEY_LEN=64 → 128 hex chars');
	assert.equal(out.salt.length, 64, 'SALT_BYTES=32 → 64 hex chars');
});

test('hashPassword produces a unique salt per call', async () => {
	const a = await hashPassword('same password');
	const b = await hashPassword('same password');
	assert.notEqual(a.salt, b.salt, 'salts should differ');
	assert.notEqual(a.hash, b.hash, 'hashes should differ given unique salts');
});

test('verifyPassword roundtrip returns true for the correct password', async () => {
	const { hash, salt } = await hashPassword('correct horse battery');
	assert.equal(await verifyPassword('correct horse battery', hash, salt), true);
});

test('verifyPassword returns false for a wrong password', async () => {
	const { hash, salt } = await hashPassword('correct horse battery');
	assert.equal(await verifyPassword('wrong password', hash, salt), false);
});

test('verifyPassword returns false for tampered hash', async () => {
	const { hash, salt } = await hashPassword('correct horse battery');
	const tamperedFirstHex = hash[0] === '0' ? '1' : '0';
	const tampered = tamperedFirstHex + hash.slice(1);
	assert.equal(await verifyPassword('correct horse battery', tampered, salt), false);
});

test('verifyPassword returns false for tampered salt', async () => {
	const { hash, salt } = await hashPassword('correct horse battery');
	const tamperedFirstHex = salt[0] === '0' ? '1' : '0';
	const tamperedSalt = tamperedFirstHex + salt.slice(1);
	assert.equal(await verifyPassword('correct horse battery', hash, tamperedSalt), false);
});

test('verifyPassword returns false on missing inputs', async () => {
	assert.equal(await verifyPassword('x', '', 'abcd'), false);
	assert.equal(await verifyPassword('x', 'abcd', ''), false);
});

test('verifyPassword returns false on invalid hex', async () => {
	assert.equal(await verifyPassword('x', 'zzznot-hex', '00'.repeat(32)), false);
});

test('verifyPassword returns false on wrong-length hash', async () => {
	const tooShort = '00'.repeat(32);
	assert.equal(await verifyPassword('x', tooShort, '00'.repeat(32)), false);
});

test('mintLoginToken produces unique URL-safe tokens', () => {
	const seen = new Set<string>();
	for (let i = 0; i < 1000; i++) {
		const t = mintLoginToken();
		assert.match(t, /^[A-Za-z0-9_-]+$/, 'base64url charset');
		assert.equal(seen.has(t), false, 'tokens should be unique');
		seen.add(t);
	}
});

test('mintLoginToken produces tokens of consistent length', () => {
	const lengths = new Set<number>();
	for (let i = 0; i < 50; i++) lengths.add(mintLoginToken().length);
	assert.equal(lengths.size, 1, 'all tokens should be the same length');
});
