import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseOpenMeteoHourlyCurrent } from '../lib/adapters/open-meteo.ts';

// ---------------------------------------------------------------------------
// Fixture — simulates a real Open-Meteo response with current + hourly + daily
// ---------------------------------------------------------------------------
const FIXTURE = {
	latitude: 38.9,
	longitude: -106.4,
	timezone: 'America/Denver',
	current_units: {
		time: 'iso8601',
		temperature_2m: '°F',
		relative_humidity_2m: '%',
		weather_code: 'wmo code',
		wind_speed_10m: 'mp/h',
	},
	current: {
		time: '2026-06-07T14:00',
		temperature_2m: 74.3,
		relative_humidity_2m: 28,
		weather_code: 2,
		wind_speed_10m: 11.5,
	},
	hourly_units: {
		time: 'iso8601',
		temperature_2m: '°F',
		weather_code: 'wmo code',
	},
	hourly: {
		time: [
			'2026-06-07T00:00', '2026-06-07T01:00', '2026-06-07T02:00',
			'2026-06-07T03:00', '2026-06-07T04:00', '2026-06-07T05:00',
			'2026-06-07T06:00', '2026-06-07T07:00', '2026-06-07T08:00',
			'2026-06-07T09:00', '2026-06-07T10:00', '2026-06-07T11:00',
			// 13th entry — should be excluded (cap at 12)
			'2026-06-07T12:00',
		],
		temperature_2m: [
			55.1, 53.4, 51.8, 50.0, 49.2, 50.6,
			56.3, 62.7, 68.4, 72.1, 74.3, 75.9,
			76.2,
		],
		weather_code: [
			1, 1, 0, 0, 0, 1,
			1, 2, 2, 3, 2, 1,
			0,
		],
	},
	daily_units: {
		time: 'iso8601',
		temperature_2m_max: '°F',
		temperature_2m_min: '°F',
		uv_index_max: '',
	},
	daily: {
		time: ['2026-06-07', '2026-06-08'],
		temperature_2m_max: [82.5, 79.1],
		temperature_2m_min: [48.3, 45.6],
		uv_index_max: [9.2, 8.7],
	},
};

// ---------------------------------------------------------------------------
// Tests: current block
// ---------------------------------------------------------------------------

test('parseOpenMeteoHourlyCurrent returns current.timestamp from current.time', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.current.timestamp, '2026-06-07T14:00');
});

test('parseOpenMeteoHourlyCurrent maps current temperature to tempF', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.current.tempF, 74.3);
});

test('parseOpenMeteoHourlyCurrent maps relative_humidity_2m to humidityPct', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.current.humidityPct, 28);
});

test('parseOpenMeteoHourlyCurrent maps wind_speed_10m to windMph', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.current.windMph, 11.5);
});

test('parseOpenMeteoHourlyCurrent derives condition from weather_code via wmoToCondition', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	// code 2 → partly-cloudy
	assert.equal(out.current.weatherCode, 2);
	assert.equal(out.current.condition, 'partly-cloudy');
});

test('parseOpenMeteoHourlyCurrent reads uvIndex from first daily uv_index_max entry', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.current.uvIndex, 9.2);
});

test('parseOpenMeteoHourlyCurrent reads today high/low from first daily entry', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.current.tempHighF, 82.5);
	assert.equal(out.current.tempLowF, 48.3);
});

// ---------------------------------------------------------------------------
// Tests: hourly block
// ---------------------------------------------------------------------------

test('parseOpenMeteoHourlyCurrent caps hourly output at 12 rows', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.hourly.length, 12);
});

test('parseOpenMeteoHourlyCurrent maps first hourly row correctly', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	assert.equal(out.hourly[0].timestamp, '2026-06-07T00:00');
	assert.equal(out.hourly[0].tempF, 55.1);
	assert.equal(out.hourly[0].weatherCode, 1);
	assert.equal(out.hourly[0].condition, 'partly-cloudy');
});

test('parseOpenMeteoHourlyCurrent maps a clear-sky hourly row correctly', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	// index 2: code 0 → clear
	assert.equal(out.hourly[2].timestamp, '2026-06-07T02:00');
	assert.equal(out.hourly[2].tempF, 51.8);
	assert.equal(out.hourly[2].condition, 'clear');
});

test('parseOpenMeteoHourlyCurrent maps a cloudy hourly row correctly', () => {
	const out = parseOpenMeteoHourlyCurrent(FIXTURE);
	// index 9: code 3 → cloudy
	assert.equal(out.hourly[9].condition, 'cloudy');
	assert.equal(out.hourly[9].tempF, 72.1);
});

// ---------------------------------------------------------------------------
// Tests: edge / null handling
// ---------------------------------------------------------------------------

test('parseOpenMeteoHourlyCurrent handles null/missing current fields gracefully', () => {
	const sparse = {
		current: { time: '2026-06-07T12:00' },
		hourly:  { time: [], temperature_2m: [], weather_code: [] },
		daily:   { time: [], temperature_2m_max: [], temperature_2m_min: [], uv_index_max: [] },
	};
	const out = parseOpenMeteoHourlyCurrent(sparse);
	assert.equal(out.current.timestamp, '2026-06-07T12:00');
	assert.equal(out.current.tempF, null);
	assert.equal(out.current.humidityPct, null);
	assert.equal(out.current.windMph, null);
	assert.equal(out.current.weatherCode, null);
	assert.equal(out.current.condition, null);
	assert.equal(out.current.uvIndex, null);
	assert.equal(out.current.tempHighF, null);
	assert.equal(out.current.tempLowF, null);
	assert.equal(out.hourly.length, 0);
});

test('parseOpenMeteoHourlyCurrent handles completely empty input', () => {
	const out = parseOpenMeteoHourlyCurrent({});
	assert.equal(out.current.timestamp, '');
	assert.equal(out.current.tempF, null);
	assert.equal(out.hourly.length, 0);
});

test('parseOpenMeteoHourlyCurrent handles null input without throwing', () => {
	const out = parseOpenMeteoHourlyCurrent(null);
	assert.equal(out.current.timestamp, '');
	assert.equal(out.hourly.length, 0);
});
