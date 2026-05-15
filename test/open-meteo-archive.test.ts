import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseArchiveDaily } from '../lib/adapters/open-meteo-archive.ts';

// Fixture: an Open-Meteo Archive /v1/archive daily response shape. Snake_case field names
// distinguish archive from the forecast endpoint (which uses 'weathercode' / 'windspeed_10m_max').
const ARCHIVE_RESPONSE = {
	latitude: 38.74,
	longitude: -106.05,
	timezone: 'America/Denver',
	daily_units: { time: 'iso8601', temperature_2m_max: '°F', precipitation_sum: 'inch' },
	daily: {
		time: ['2025-04-01', '2025-04-02', '2025-04-03'],
		weather_code: [3, 71, 0],
		temperature_2m_max: [42.1, 38.5, 51.8],
		temperature_2m_min: [22.3, 19.0, 28.4],
		precipitation_sum: [0.0, 0.42, 0.0],
		snowfall_sum: [0.0, 4.2, 0.0],
		wind_speed_10m_max: [9.4, 14.2, 6.1],
	},
};

test('parseArchiveDaily produces one row per day in daily.time', () => {
	const out = parseArchiveDaily(ARCHIVE_RESPONSE);
	assert.equal(out.length, 3);
	assert.equal(out[0].date, '2025-04-01');
	assert.equal(out[2].date, '2025-04-03');
});

test('parseArchiveDaily maps fahrenheit + precip + snow into the observation shape', () => {
	const out = parseArchiveDaily(ARCHIVE_RESPONSE);
	assert.equal(out[0].tempHighF, 42.1);
	assert.equal(out[0].tempLowF, 22.3);
	assert.equal(out[1].precipIn, 0.42);
	assert.equal(out[1].precipSnowIn, 4.2);
	assert.equal(out[2].windMph, 6.1);
});

test('parseArchiveDaily derives condition from weather_code via wmoToCondition', () => {
	const out = parseArchiveDaily(ARCHIVE_RESPONSE);
	assert.equal(out[0].weatherCode, 3);
	assert.equal(out[0].condition, 'cloudy');
	assert.equal(out[1].condition, 'snow');     // code 71 → snow
	assert.equal(out[2].condition, 'clear');    // code 0 → clear
});

test('parseArchiveDaily accepts forecast-style camelCase field names too (tolerant parser)', () => {
	// Forecast endpoint uses 'weathercode' (no underscore) and 'windspeed_10m_max'.
	// The parser should consume either shape so callers don't need to know which API responded.
	const forecastShape = {
		daily: {
			time: ['2025-04-01'],
			weathercode: [0],
			temperature_2m_max: [60],
			temperature_2m_min: [40],
			precipitation_sum: [0],
			snowfall_sum: [0],
			windspeed_10m_max: [12.5],
		},
	};
	const out = parseArchiveDaily(forecastShape);
	assert.equal(out.length, 1);
	assert.equal(out[0].weatherCode, 0);
	assert.equal(out[0].condition, 'clear');
	assert.equal(out[0].windMph, 12.5);
});

test('parseArchiveDaily passes through nulls for missing parallel-array entries', () => {
	const sparseResponse = {
		daily: {
			time: ['2025-04-01', '2025-04-02'],
			weather_code: [null, 0],
			temperature_2m_max: [42, null],
			temperature_2m_min: [null, 28],
			precipitation_sum: [null, null],
			snowfall_sum: [null, null],
			wind_speed_10m_max: [null, 8],
		},
	};
	const out = parseArchiveDaily(sparseResponse);
	assert.equal(out[0].weatherCode, null);
	assert.equal(out[0].condition, null);   // no code → no condition
	assert.equal(out[0].tempHighF, 42);
	assert.equal(out[0].tempLowF, null);
	assert.equal(out[1].tempHighF, null);
	assert.equal(out[1].windMph, 8);
});

test('parseArchiveDaily handles empty / malformed input gracefully', () => {
	assert.deepEqual(parseArchiveDaily(null), []);
	assert.deepEqual(parseArchiveDaily({}), []);
	assert.deepEqual(parseArchiveDaily({ daily: null }), []);
	assert.deepEqual(parseArchiveDaily({ daily: {} }), []);
	assert.deepEqual(parseArchiveDaily({ daily: { time: 'not-an-array' } }), []);
});
