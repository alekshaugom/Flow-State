import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateVisibility, buildNewLogRow } from '../lib/log/river-log-pure.ts';

test('validateVisibility allows private explicitly', () => {
	assert.equal(validateVisibility('private'), null);
});

test('validateVisibility allows omitting the field', () => {
	assert.equal(validateVisibility(undefined), null);
	assert.equal(validateVisibility(null), null);
});

test('validateVisibility rejects "public"', () => {
	const err = validateVisibility('public');
	assert.ok(err, 'expected an error');
	assert.equal(err?.status, 400);
	assert.match(err!.error, /private/);
});

test('validateVisibility rejects "friends"', () => {
	const err = validateVisibility('friends');
	assert.ok(err);
	assert.equal(err?.status, 400);
});

test('validateVisibility rejects arbitrary strings', () => {
	for (const v of ['shared', 'unlisted', 'team', '', '   ']) {
		const err = validateVisibility(v);
		assert.ok(err, `expected error for ${JSON.stringify(v)}`);
		assert.equal(err?.status, 400);
	}
});

test('buildNewLogRow always writes visibility=private even if input had visibility=public', () => {
	// Defense-in-depth: even if validateVisibility were bypassed, builder forces private.
	const log = buildNewLogRow(
		{ userId: 'u1', sectionId: 's1', date: '2026-05-16', visibility: 'public' } as any,
		{ section: {}, corridor: null, flow: null, id: 'id', now: '2026-05-18T12:00:00.000Z' },
	);
	assert.equal(log.visibility, 'private');
});
