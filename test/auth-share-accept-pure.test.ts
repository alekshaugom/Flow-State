import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { decidePromotion } from '../lib/auth/share-accept-pure.ts';

test('decidePromotion returns create for null/undefined user', () => {
	assert.equal(decidePromotion(null), 'create');
	assert.equal(decidePromotion(undefined), 'create');
});

test('decidePromotion returns noop for already-approved user', () => {
	assert.equal(decidePromotion({ status: 'approved' }), 'noop');
});

test('decidePromotion returns reject-denied for denied user', () => {
	assert.equal(decidePromotion({ status: 'denied' }), 'reject-denied');
});

test('decidePromotion returns promote for waitlist / pending / other statuses', () => {
	assert.equal(decidePromotion({ status: 'waitlist' }), 'promote');
	assert.equal(decidePromotion({ status: 'pending' }), 'promote');
	assert.equal(decidePromotion({ status: null }), 'promote');
	assert.equal(decidePromotion({}), 'promote');
});
