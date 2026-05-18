import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { decideActivationRoute } from '../lib/auth/activation-pure.ts';

test('decideActivationRoute → /login/setup when hasPassword is false', () => {
	assert.equal(decideActivationRoute({ hasPassword: false }), '/login/setup');
});

test('decideActivationRoute → /login/setup when hasPassword is missing', () => {
	assert.equal(decideActivationRoute({}), '/login/setup');
});

test('decideActivationRoute → /login/setup when hasPassword is null', () => {
	assert.equal(decideActivationRoute({ hasPassword: null }), '/login/setup');
});

test('decideActivationRoute → / when hasPassword is true', () => {
	assert.equal(decideActivationRoute({ hasPassword: true }), '/');
});

test('decideActivationRoute safely handles null/undefined input', () => {
	assert.equal(decideActivationRoute(null as any), '/login/setup');
	assert.equal(decideActivationRoute(undefined as any), '/login/setup');
});
