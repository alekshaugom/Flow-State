import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	canUserAccessTrip,
	validateParticipantPatch,
	buildCraftSequence,
	craftIdsFromSequence,
	parseCraftSequence,
	stringifyCraftSequence,
} from '../lib/log/participant-pure.ts';

test('canUserAccessTrip returns not-found for null/undefined', () => {
	assert.equal(canUserAccessTrip(null), 'not-found');
	assert.equal(canUserAccessTrip(undefined), 'not-found');
});

test('canUserAccessTrip returns pending when acceptedAt is null', () => {
	assert.equal(canUserAccessTrip({ acceptedAt: null }), 'pending');
	assert.equal(canUserAccessTrip({}), 'pending');
});

test('canUserAccessTrip returns accepted when acceptedAt set', () => {
	assert.equal(canUserAccessTrip({ acceptedAt: '2026-05-18T00:00:00.000Z' }), 'accepted');
});

test('canUserAccessTrip returns declined when declinedAt set', () => {
	assert.equal(canUserAccessTrip({ declinedAt: '2026-05-18T00:00:00.000Z' }), 'declined');
});

test('canUserAccessTrip returns removed when removedAt set (even if accepted)', () => {
	assert.equal(canUserAccessTrip({ acceptedAt: '2026-05-18T00:00:00.000Z', removedAt: '2026-05-19T00:00:00.000Z' }), 'removed');
});

test('validateParticipantPatch as self allows notes, notesPrivate, craftSequenceJson, craftIds, acceptedAt, declinedAt', () => {
	const result = validateParticipantPatch({
		notes: 'fun trip',
		notesPrivate: true,
		craftSequenceJson: '[]',
		craftIds: ['craft1'],
		acceptedAt: '2026-05-18T00:00:00.000Z',
		declinedAt: null,
	}, true);
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.fields.notes, 'fun trip');
		assert.equal(result.fields.notesPrivate, true);
	}
});

test('validateParticipantPatch as self rejects removedAt and other-only fields', () => {
	const result = validateParticipantPatch({ removedAt: '2026-05-18T00:00:00.000Z' }, true);
	assert.equal(result.ok, false);
});

test('validateParticipantPatch as other allows only removedAt', () => {
	const ok = validateParticipantPatch({ removedAt: '2026-05-18T00:00:00.000Z' }, false);
	assert.equal(ok.ok, true);
	const bad = validateParticipantPatch({ notes: 'bad' }, false);
	assert.equal(bad.ok, false);
});

test('validateParticipantPatch silently ignores identity fields', () => {
	const result = validateParticipantPatch({
		id: 'evil',
		tripId: 'evil',
		userId: 'evil',
		addedBy: 'evil',
		notes: 'fine',
	}, true);
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal('id' in result.fields, false);
		assert.equal('tripId' in result.fields, false);
		assert.equal('userId' in result.fields, false);
		assert.equal(result.fields.notes, 'fine');
	}
});

test('validateParticipantPatch rejects empty body', () => {
	assert.equal(validateParticipantPatch(null, true).ok, false);
	assert.equal(validateParticipantPatch(undefined, true).ok, false);
});

test('buildCraftSequence resolves details via lookup', () => {
	const lookup = (id: string) => id === 'c1' ? { craftType: 'oar-raft', craftSize: '14', name: 'Slippery Pickle' } : null;
	const seq = buildCraftSequence(['c1', 'c2', null], lookup);
	assert.equal(seq.length, 3);
	assert.equal(seq[0].craftId, 'c1');
	assert.equal(seq[0].craftName, 'Slippery Pickle');
	assert.equal(seq[1].craftId, 'c2');
	assert.equal(seq[1].craftName, null);
	assert.equal(seq[2].craftId, null);
});

test('craftIdsFromSequence returns non-null craft IDs in order', () => {
	const ids = craftIdsFromSequence([
		{ craftId: 'a', craftType: null, craftSize: null, craftName: null },
		{ craftId: null, craftType: null, craftSize: null, craftName: null },
		{ craftId: 'b', craftType: null, craftSize: null, craftName: null },
	]);
	assert.deepEqual(ids, ['a', 'b']);
});

test('parseCraftSequence handles null/invalid JSON gracefully', () => {
	assert.deepEqual(parseCraftSequence(null), []);
	assert.deepEqual(parseCraftSequence(undefined), []);
	assert.deepEqual(parseCraftSequence(''), []);
	assert.deepEqual(parseCraftSequence('not json'), []);
	assert.deepEqual(parseCraftSequence('{"oops": true}'), []);
});

test('stringifyCraftSequence round-trips', () => {
	const seq = [
		{ craftId: 'c1', craftType: 'oar-raft', craftSize: '14', craftName: 'Pickle' },
		{ craftId: 'c2', craftType: 'kayak', craftSize: '9', craftName: 'Blue' },
	];
	const json = stringifyCraftSequence(seq);
	assert.ok(json);
	assert.deepEqual(parseCraftSequence(json), seq);
});

test('stringifyCraftSequence returns null for empty sequence', () => {
	assert.equal(stringifyCraftSequence([]), null);
});
