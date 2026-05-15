import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseRiseDownloadResponse } from '../lib/adapters/bor.ts';

// Fixture: actual BOR RISE /result/download response shape — object with numbered string keys
// plus metadata. Captured 2026-05-15 by hitting itemId=512.
const RISE_OBJECT_RESPONSE = {
	Location: { Name: 'Lake Powell Glen Canyon Dam and Powerplant', State: 'AZ' },
	Timezone: 'MT',
	'Parameter Name:': 'Lake/Reservoir Inflow - Unregulated',
	Units: 'cfs',
	'0': { dateTime: '2026-05-08 07:00:00', result: 2941.29, timeStep: 'day', resultType: 'observed' },
	'1': { dateTime: '2026-05-09 07:00:00', result: 3771.18, timeStep: 'day', resultType: 'observed' },
	'2': { dateTime: '2026-05-10 07:00:00', result: 2643.53, timeStep: 'day', resultType: 'observed' },
	Results: [],
};

test('parseRiseDownloadResponse handles numbered-key object response', () => {
	const map = parseRiseDownloadResponse(RISE_OBJECT_RESPONSE);
	assert.equal(map.size, 3, 'should find 3 numbered rows');
	// Values should be keyed by YYYY-MM-DD
	assert.equal(map.get('2026-05-08'), 2941.29);
	assert.equal(map.get('2026-05-09'), 3771.18);
	assert.equal(map.get('2026-05-10'), 2643.53);
});

test('parseRiseDownloadResponse handles legacy array response', () => {
	const arr = [
		{ dateTime: '2026-05-08 07:00:00', result: 100 },
		{ dateTime: '2026-05-09 07:00:00', result: 200 },
	];
	const map = parseRiseDownloadResponse(arr);
	assert.equal(map.size, 2);
	assert.equal(map.get('2026-05-08'), 100);
});

test('parseRiseDownloadResponse skips rows with null result', () => {
	const data = {
		'0': { dateTime: '2026-05-08', result: 100 },
		'1': { dateTime: '2026-05-09', result: null },
	};
	const map = parseRiseDownloadResponse(data);
	assert.equal(map.size, 1);
});

test('parseRiseDownloadResponse warns when Location.Name mismatches expectedName', () => {
	const warnings: string[] = [];
	const origWarn = console.warn;
	console.warn = (...args: any[]) => { warnings.push(args.join(' ')); };

	try {
		parseRiseDownloadResponse(RISE_OBJECT_RESPONSE, 'Blue Mesa Reservoir', '512');
	} finally {
		console.warn = origWarn;
	}

	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /stale catalog/);
	assert.match(warnings[0], /Lake Powell/);
	assert.match(warnings[0], /Blue Mesa/);
});

test('parseRiseDownloadResponse stays silent when Location.Name matches', () => {
	const warnings: string[] = [];
	const origWarn = console.warn;
	console.warn = (...args: any[]) => { warnings.push(args.join(' ')); };

	try {
		parseRiseDownloadResponse(RISE_OBJECT_RESPONSE, 'Lake Powell Glen Canyon Dam', '512');
	} finally {
		console.warn = origWarn;
	}

	assert.equal(warnings.length, 0);
});

test('parseRiseDownloadResponse handles empty/null input gracefully', () => {
	assert.equal(parseRiseDownloadResponse(null).size, 0);
	assert.equal(parseRiseDownloadResponse(undefined).size, 0);
	assert.equal(parseRiseDownloadResponse({}).size, 0);
});
