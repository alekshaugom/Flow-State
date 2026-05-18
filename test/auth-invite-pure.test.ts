import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { emailToUserId, validateInviteInput } from '../lib/auth/invite-pure.ts';

test('emailToUserId produces the email_ prefix + slugified email', () => {
	assert.equal(emailToUserId('alice@example.com'), 'email_alice_example_com');
});

test('emailToUserId is case-insensitive (lowercases input)', () => {
	assert.equal(emailToUserId('Alice@Example.COM'), 'email_alice_example_com');
});

test('emailToUserId collapses runs of non-alphanumerics into a single underscore', () => {
	assert.equal(emailToUserId('alice...foo@example.com'), 'email_alice_foo_example_com');
});

test('emailToUserId strips leading and trailing underscores from the slug body', () => {
	assert.equal(emailToUserId('@a@'), 'email_a');
});

test('emailToUserId documents the known collision: alice.foo@x.com vs alice_foo@x.com', () => {
	assert.equal(emailToUserId('alice.foo@x.com'), emailToUserId('alice_foo@x.com'));
});

test('validateInviteInput accepts email + firstName + lastName', () => {
	const out = validateInviteInput({ email: 'Alice@Example.com', firstName: '  Alice  ', lastName: '  Smith  ' });
	assert.equal(out.ok, true);
	if (out.ok) {
		assert.equal(out.value.email, 'alice@example.com');
		assert.equal(out.value.firstName, 'Alice');
		assert.equal(out.value.lastName, 'Smith');
		assert.equal(out.value.name, 'Alice Smith');
	}
});

test('validateInviteInput preserves multi-word last names', () => {
	const out = validateInviteInput({ email: 'a@b.com', firstName: 'Alice', lastName: 'de la Cruz' });
	assert.equal(out.ok, true);
	if (out.ok) {
		assert.equal(out.value.lastName, 'de la Cruz');
		assert.equal(out.value.name, 'Alice de la Cruz');
	}
});

test('validateInviteInput rejects missing or malformed email', () => {
	for (const e of [undefined, '', '   ', 'not-an-email', 42, null]) {
		const out = validateInviteInput({ email: e as any, firstName: 'Alice', lastName: 'Smith' });
		assert.equal(out.ok, false, `expected fail for email=${JSON.stringify(e)}`);
	}
});

test('validateInviteInput rejects missing or blank firstName', () => {
	for (const n of [undefined, '', '   ', '\t\n', 123, null]) {
		const out = validateInviteInput({ email: 'a@b.com', firstName: n as any, lastName: 'Smith' });
		assert.equal(out.ok, false, `expected fail for firstName=${JSON.stringify(n)}`);
	}
});

test('validateInviteInput rejects missing or blank lastName', () => {
	for (const n of [undefined, '', '   ', '\t\n', 123, null]) {
		const out = validateInviteInput({ email: 'a@b.com', firstName: 'Alice', lastName: n as any });
		assert.equal(out.ok, false, `expected fail for lastName=${JSON.stringify(n)}`);
	}
});

test('validateInviteInput rejects each part > 80 chars', () => {
	const tooLong = 'a'.repeat(81);
	const longFirst = validateInviteInput({ email: 'a@b.com', firstName: tooLong, lastName: 'Smith' });
	assert.equal(longFirst.ok, false);
	const longLast = validateInviteInput({ email: 'a@b.com', firstName: 'Alice', lastName: tooLong });
	assert.equal(longLast.ok, false);
});
