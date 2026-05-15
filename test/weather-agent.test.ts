import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { combineNwsPeriodsToDaily } from '../lib/adapters/noaa.ts';

// Fixture: a trimmed NWS /forecast periods array. Reality is 7 days * 2 periods (day + night),
// alternating isDaytime; same `startTime` date for both members of a day/night pair.
const PERIODS = [
	{
		number: 1, name: 'Today', startTime: '2026-05-15T08:00:00-06:00', endTime: '2026-05-15T18:00:00-06:00',
		isDaytime: true, temperature: 72, temperatureUnit: 'F',
		windSpeed: '5 to 10 mph', windDirection: 'SW',
		shortForecast: 'Sunny', detailedForecast: 'Sunny. High near 72.',
		probabilityOfPrecipitation: { value: 10 },
	},
	{
		number: 2, name: 'Tonight', startTime: '2026-05-15T18:00:00-06:00', endTime: '2026-05-16T06:00:00-06:00',
		isDaytime: false, temperature: 45, temperatureUnit: 'F',
		windSpeed: '5 mph', windDirection: 'SW',
		shortForecast: 'Mostly Clear', detailedForecast: 'Mostly clear. Low around 45.',
		probabilityOfPrecipitation: { value: 5 },
	},
	{
		number: 3, name: 'Saturday', startTime: '2026-05-16T06:00:00-06:00', endTime: '2026-05-16T18:00:00-06:00',
		isDaytime: true, temperature: 68, temperatureUnit: 'F',
		windSpeed: '10 to 20 mph', windDirection: 'W',
		shortForecast: 'Chance Showers', detailedForecast: 'Chance of showers. Rain likely after noon.',
		probabilityOfPrecipitation: { value: 60 },
	},
	{
		number: 4, name: 'Saturday Night', startTime: '2026-05-16T18:00:00-06:00', endTime: '2026-05-17T06:00:00-06:00',
		isDaytime: false, temperature: 42, temperatureUnit: 'F',
		windSpeed: '5 to 10 mph', windDirection: 'W',
		shortForecast: 'Snow Showers',
		detailedForecast: 'Chance of snow showers overnight.',
		probabilityOfPrecipitation: { value: 50 },
	},
];

test('combineNwsPeriodsToDaily produces one row per date', () => {
	const days = combineNwsPeriodsToDaily(PERIODS);
	assert.equal(days.length, 2);
	assert.equal(days[0].date, '2026-05-15');
	assert.equal(days[1].date, '2026-05-16');
});

test('combineNwsPeriodsToDaily picks day temp as high, night temp as low', () => {
	const days = combineNwsPeriodsToDaily(PERIODS);
	assert.equal(days[0].tempHighF, 72);
	assert.equal(days[0].tempLowF, 45);
	assert.equal(days[1].tempHighF, 68);
	assert.equal(days[1].tempLowF, 42);
});

test('combineNwsPeriodsToDaily extracts max wind from "X to Y mph" strings', () => {
	const days = combineNwsPeriodsToDaily(PERIODS);
	assert.equal(days[0].windMph, 10);  // "5 to 10 mph" → 10
	assert.equal(days[1].windMph, 20);  // "10 to 20 mph" → 20
});

test('combineNwsPeriodsToDaily prefers day-period precipitation probability when present', () => {
	const days = combineNwsPeriodsToDaily(PERIODS);
	assert.equal(days[0].precipProb, 10);
	assert.equal(days[1].precipProb, 60);
});

test('combineNwsPeriodsToDaily infers snowOrRain from period text', () => {
	const days = combineNwsPeriodsToDaily(PERIODS);
	assert.equal(days[1].snowOrRain, 'snow', 'Saturday night mentions snow showers');
});

test('combineNwsPeriodsToDaily falls back to rain for shower/rain text', () => {
	const days = combineNwsPeriodsToDaily([{
		startTime: '2026-05-17T06:00:00-06:00', isDaytime: true, temperature: 70,
		windSpeed: '10 mph', shortForecast: 'Showers', detailedForecast: 'Light rain likely.',
	}]);
	assert.equal(days[0].snowOrRain, 'rain');
});

test('combineNwsPeriodsToDaily returns null for snowOrRain when ambiguous', () => {
	const days = combineNwsPeriodsToDaily([{
		startTime: '2026-05-17T06:00:00-06:00', isDaytime: true, temperature: 80,
		windSpeed: '5 mph', shortForecast: 'Sunny', detailedForecast: 'Sunny and warm.',
	}]);
	assert.equal(days[0].snowOrRain, null);
});

test('combineNwsPeriodsToDaily handles empty input', () => {
	assert.deepEqual(combineNwsPeriodsToDaily([]), []);
});
