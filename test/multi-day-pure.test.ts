import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	validateDateRange,
	tripNightsBetween,
	parseCamping,
	stringifyCamping,
	validateCampingAgainstRange,
	MAX_TRIP_NIGHTS,
} from '../lib/log/multi-day-pure.ts';

test('validateDateRange accepts a single-day trip (no endDate)', () => {
	assert.equal(validateDateRange('2026-05-16', null), null);
	assert.equal(validateDateRange('2026-05-16', undefined), null);
	assert.equal(validateDateRange('2026-05-16', ''), null);
});

test('validateDateRange accepts same-day endDate', () => {
	assert.equal(validateDateRange('2026-05-16', '2026-05-16'), null);
});

test('validateDateRange accepts a 3-day trip', () => {
	assert.equal(validateDateRange('2026-05-15', '2026-05-17'), null);
});

test('validateDateRange rejects malformed start date', () => {
	const err = validateDateRange('not-a-date', null);
	assert.ok(err);
	assert.equal(err?.status, 400);
});

test('validateDateRange rejects malformed end date', () => {
	const err = validateDateRange('2026-05-15', 'oops');
	assert.ok(err);
});

test('validateDateRange rejects endDate before date', () => {
	const err = validateDateRange('2026-05-17', '2026-05-15');
	assert.ok(err);
	assert.match(err!.error, /on or after/);
});

test('validateDateRange rejects trip longer than MAX_TRIP_NIGHTS', () => {
	const err = validateDateRange('2026-05-01', '2026-05-16');
	assert.ok(err);
	assert.match(err!.error, new RegExp(`${MAX_TRIP_NIGHTS}`));
});

test('tripNightsBetween returns 0 for single-day', () => {
	assert.equal(tripNightsBetween('2026-05-16', null), 0);
	assert.equal(tripNightsBetween('2026-05-16', '2026-05-16'), 0);
});

test('tripNightsBetween counts nights correctly', () => {
	assert.equal(tripNightsBetween('2026-05-15', '2026-05-16'), 1);
	assert.equal(tripNightsBetween('2026-05-15', '2026-05-17'), 2);
	assert.equal(tripNightsBetween('2026-05-15', '2026-05-22'), 7);
});

test('tripNightsBetween returns 0 for inverted range', () => {
	assert.equal(tripNightsBetween('2026-05-17', '2026-05-15'), 0);
});

test('parseCamping returns [] for empty input', () => {
	assert.deepEqual(parseCamping(null), []);
	assert.deepEqual(parseCamping(undefined), []);
	assert.deepEqual(parseCamping(''), []);
});

test('parseCamping returns [] for malformed JSON', () => {
	assert.deepEqual(parseCamping('not json'), []);
	assert.deepEqual(parseCamping('{"not":"array"}'), []);
});

test('parseCamping parses valid array', () => {
	const json = JSON.stringify([
		{ date: '2026-05-15', location: 'Hayden Meadows' },
		{ date: '2026-05-16', location: 'Stone Bridge' },
	]);
	assert.deepEqual(parseCamping(json), [
		{ date: '2026-05-15', location: 'Hayden Meadows' },
		{ date: '2026-05-16', location: 'Stone Bridge' },
	]);
});

test('parseCamping drops entries with bad date or missing location', () => {
	const json = JSON.stringify([
		{ date: '2026-05-15', location: 'OK' },
		{ date: 'bad-date', location: 'X' },
		{ date: '2026-05-17', location: '' },
		{ location: 'no date' },
	]);
	assert.deepEqual(parseCamping(json), [{ date: '2026-05-15', location: 'OK' }]);
});

test('stringifyCamping returns null for empty list', () => {
	assert.equal(stringifyCamping([]), null);
	assert.equal(stringifyCamping(null), null);
	assert.equal(stringifyCamping(undefined), null);
});

test('stringifyCamping trims locations and drops invalid entries', () => {
	const out = stringifyCamping([
		{ date: '2026-05-15', location: '  Hayden Meadows  ' },
		{ date: 'oops', location: 'bad date' },
		{ date: '2026-05-16', location: '' },
		{ date: '2026-05-17', location: 'Trout Creek' },
	]);
	assert.ok(out);
	assert.deepEqual(JSON.parse(out!), [
		{ date: '2026-05-15', location: 'Hayden Meadows' },
		{ date: '2026-05-17', location: 'Trout Creek' },
	]);
});

test('stringifyCamping → parseCamping roundtrip', () => {
	const nights = [
		{ date: '2026-05-15', location: 'Hayden Meadows' },
		{ date: '2026-05-16', location: 'Stone Bridge' },
	];
	const json = stringifyCamping(nights);
	assert.deepEqual(parseCamping(json), nights);
});

test('validateCampingAgainstRange allows empty list on single-day trip', () => {
	assert.equal(validateCampingAgainstRange([], '2026-05-16', null), null);
});

test('validateCampingAgainstRange rejects camping on a single-day trip', () => {
	const err = validateCampingAgainstRange(
		[{ date: '2026-05-16', location: 'Stone Bridge' }],
		'2026-05-16',
		null,
	);
	assert.ok(err);
	assert.equal(err?.status, 400);
	assert.match(err!.error, /multi-day/);
});

test('validateCampingAgainstRange accepts nights inside range', () => {
	assert.equal(
		validateCampingAgainstRange(
			[
				{ date: '2026-05-15', location: 'Hayden Meadows' },
				{ date: '2026-05-16', location: 'Stone Bridge' },
			],
			'2026-05-15',
			'2026-05-17',
		),
		null,
	);
});

test('validateCampingAgainstRange rejects night before the trip starts', () => {
	const err = validateCampingAgainstRange(
		[{ date: '2026-05-14', location: 'Too early' }],
		'2026-05-15',
		'2026-05-17',
	);
	assert.ok(err);
	assert.match(err!.error, /outside trip range/);
});

test('validateCampingAgainstRange rejects night on or after take-out day', () => {
	const err = validateCampingAgainstRange(
		[{ date: '2026-05-17', location: 'Already took out' }],
		'2026-05-15',
		'2026-05-17',
	);
	assert.ok(err);
});
