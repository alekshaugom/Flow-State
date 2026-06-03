import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolveCapabilities } from '../lib/auth/capabilities-pure.ts';

test('approved + null role → isMember:true, isAdmin:false', () => {
	const caps = resolveCapabilities({ status: 'approved', role: null });
	assert.equal(caps.isMember, true);
	assert.equal(caps.isAdmin, false);
});

test('approved + member role → isMember:true, isAdmin:false', () => {
	const caps = resolveCapabilities({ status: 'approved', role: 'member' });
	assert.equal(caps.isMember, true);
	assert.equal(caps.isAdmin, false);
});

test('approved + admin role → isMember:true, isAdmin:true', () => {
	const caps = resolveCapabilities({ status: 'approved', role: 'admin' });
	assert.equal(caps.isMember, true);
	assert.equal(caps.isAdmin, true);
});

test('approved + superadmin role → isAdmin:true', () => {
	const caps = resolveCapabilities({ status: 'approved', role: 'superadmin' });
	assert.equal(caps.isAdmin, true);
});

test('waitlist + admin role → isMember:false, isAdmin:false (role alone does not grant)', () => {
	const caps = resolveCapabilities({ status: 'waitlist', role: 'admin' });
	assert.equal(caps.isMember, false);
	assert.equal(caps.isAdmin, false);
});

test('denied + admin role → isMember:false, isAdmin:false', () => {
	const caps = resolveCapabilities({ status: 'denied', role: 'admin' });
	assert.equal(caps.isMember, false);
	assert.equal(caps.isAdmin, false);
});

// canReceivePayout remains a false stub until slice 23 (Stripe extraction / cash-out)
test('canReceivePayout: stub false for all roles', () => {
	const cases = [
		{ status: 'approved', role: 'superadmin' },
		{ status: 'approved', role: 'admin' },
		{ status: 'approved', role: 'member' },
		{ status: 'waitlist', role: null },
	];
	for (const input of cases) {
		const caps = resolveCapabilities(input);
		assert.equal(caps.canReceivePayout, false, `canReceivePayout should be false for ${JSON.stringify(input)}`);
	}
});

// canFund: slice 22 — approved members can fund bounties; waitlist/denied cannot
test('canFund: true for approved members, false for non-approved', () => {
	const member   = resolveCapabilities({ status: 'approved', role: 'member' });
	assert.equal(member.canFund, true);

	const admin    = resolveCapabilities({ status: 'approved', role: 'admin' });
	assert.equal(admin.canFund, true);

	const superadm = resolveCapabilities({ status: 'approved', role: 'superadmin' });
	assert.equal(superadm.canFund, true);

	const waitlist = resolveCapabilities({ status: 'waitlist', role: null });
	assert.equal(waitlist.canFund, false);

	const denied   = resolveCapabilities({ status: 'denied', role: null });
	assert.equal(denied.canFund, false);
});

test('canContribute: true for approved members, false for non-approved', () => {
	const approved = resolveCapabilities({ status: 'approved', role: 'member' });
	assert.equal(approved.canContribute, true);

	const adminApproved = resolveCapabilities({ status: 'approved', role: 'admin' });
	assert.equal(adminApproved.canContribute, true);

	const waitlist = resolveCapabilities({ status: 'waitlist', role: null });
	assert.equal(waitlist.canContribute, false);

	const denied = resolveCapabilities({ status: 'denied', role: null });
	assert.equal(denied.canContribute, false);
});
