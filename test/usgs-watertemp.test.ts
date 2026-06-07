import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseUsgsWaterTempResponse } from '../lib/adapters/usgs.ts';

// Fixture: minimal USGS OGC Features response for parameter 00010 (water temp).
// One site, two valid readings, one no-data sentinel (-999999), one wrong parameter.
const FIXTURE = {
	type: 'FeatureCollection',
	features: [
		{
			properties: {
				monitoring_location_id: 'USGS-09085000',
				parameter_code: '00010',
				time: '2026-06-07T12:00:00Z',
				value: '14.2',
				unit_of_measure: 'deg C',
				approval_status: 'P',
				qualifier: null,
			},
		},
		{
			properties: {
				monitoring_location_id: 'USGS-09085000',
				parameter_code: '00010',
				time: '2026-06-07T13:00:00Z',
				value: '14.8',
				unit_of_measure: 'deg C',
				approval_status: 'P',
				qualifier: null,
			},
		},
		// no-data sentinel — must be skipped
		{
			properties: {
				monitoring_location_id: 'USGS-09085000',
				parameter_code: '00010',
				time: '2026-06-07T14:00:00Z',
				value: '-999999',
				unit_of_measure: 'deg C',
				approval_status: 'P',
				qualifier: null,
			},
		},
		// wrong parameter code — must be skipped
		{
			properties: {
				monitoring_location_id: 'USGS-09085000',
				parameter_code: '00060',
				time: '2026-06-07T12:00:00Z',
				value: '350',
				unit_of_measure: 'ft^3/s',
				approval_status: 'P',
				qualifier: null,
			},
		},
	],
	numberReturned: 4,
	links: [],
};

test('parseUsgsWaterTempResponse returns one record per valid 00010 feature', () => {
	const records = parseUsgsWaterTempResponse(FIXTURE);
	assert.equal(records.length, 2, 'sentinel and wrong-parameter rows must be excluded');
});

test('parseUsgsWaterTempResponse computes correct gaugeId from USGS- prefixed site', () => {
	const records = parseUsgsWaterTempResponse(FIXTURE);
	assert.equal(records[0].gaugeId, 'usgs-09085000');
	assert.equal(records[1].gaugeId, 'usgs-09085000');
});

test('parseUsgsWaterTempResponse preserves tempC and converts to tempF correctly', () => {
	const records = parseUsgsWaterTempResponse(FIXTURE);

	// first reading: 14.2 °C → 57.56 °F
	assert.equal(records[0].tempC, 14.2);
	assert.equal(records[0].tempF, parseFloat((14.2 * 9 / 5 + 32).toFixed(4)));

	// second reading: 14.8 °C → 58.64 °F
	assert.equal(records[1].tempC, 14.8);
	assert.equal(records[1].tempF, parseFloat((14.8 * 9 / 5 + 32).toFixed(4)));
});

test('parseUsgsWaterTempResponse stamps source correctly', () => {
	const records = parseUsgsWaterTempResponse(FIXTURE);
	for (const r of records) {
		assert.equal(r.source, 'usgs-iv');
	}
});

test('parseUsgsWaterTempResponse accepts custom source override', () => {
	const records = parseUsgsWaterTempResponse(FIXTURE, 'usgs-dv');
	assert.equal(records[0].source, 'usgs-dv');
});

test('parseUsgsWaterTempResponse produces unique ids per timestamp', () => {
	const records = parseUsgsWaterTempResponse(FIXTURE);
	const ids = records.map(r => r.id);
	assert.equal(new Set(ids).size, ids.length, 'all ids must be unique');
});

test('parseUsgsWaterTempResponse skips -999999 no-data sentinel', () => {
	const sentinelOnly = {
		type: 'FeatureCollection',
		features: [{
			properties: {
				monitoring_location_id: 'USGS-09085000',
				parameter_code: '00010',
				time: '2026-06-07T00:00:00Z',
				value: '-999999',
				unit_of_measure: 'deg C',
				approval_status: 'P',
				qualifier: null,
			},
		}],
		numberReturned: 1,
		links: [],
	};
	assert.equal(parseUsgsWaterTempResponse(sentinelOnly).length, 0);
});

test('parseUsgsWaterTempResponse handles null/undefined/empty input gracefully', () => {
	assert.deepEqual(parseUsgsWaterTempResponse(null), []);
	assert.deepEqual(parseUsgsWaterTempResponse(undefined), []);
	assert.deepEqual(parseUsgsWaterTempResponse({ type: 'FeatureCollection', features: [] }), []);
});

test('parseUsgsWaterTempResponse handles non-USGS-prefixed site ids', () => {
	const noPrefix = {
		type: 'FeatureCollection',
		features: [{
			properties: {
				monitoring_location_id: '09085000',
				parameter_code: '00010',
				time: '2026-06-07T12:00:00Z',
				value: '10.0',
				unit_of_measure: 'deg C',
				approval_status: 'P',
				qualifier: null,
			},
		}],
		numberReturned: 1,
		links: [],
	};
	const records = parseUsgsWaterTempResponse(noPrefix);
	assert.equal(records.length, 1);
	assert.equal(records[0].gaugeId, 'usgs-09085000');
});
