import { fetchWithRetry } from '../utils.ts';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

// WMO weathercode → compact condition + icon name
// https://open-meteo.com/en/docs (weathercode table)
export type WeatherCondition = 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunderstorm';

export function wmoToCondition(code: number | null | undefined): WeatherCondition | null {
	if (code == null) return null;
	if (code === 0) return 'clear';
	if (code === 1 || code === 2) return 'partly-cloudy';
	if (code === 3) return 'cloudy';
	if (code === 45 || code === 48) return 'fog';
	if (code >= 51 && code <= 67) return 'rain';
	if (code >= 80 && code <= 82) return 'rain';
	if (code >= 71 && code <= 77) return 'snow';
	if (code === 85 || code === 86) return 'snow';
	if (code >= 95 && code <= 99) return 'thunderstorm';
	return null;
}

export function conditionToIcon(c: WeatherCondition | null): string {
	switch (c) {
		case 'clear':         return 'sun';
		case 'partly-cloudy': return 'cloud-sun';
		case 'cloudy':        return 'cloud';
		case 'fog':           return 'cloud-fog';
		case 'rain':          return 'cloud-rain';
		case 'snow':          return 'cloud-snow';
		case 'thunderstorm':  return 'cloud-bolt';
		default:              return 'cloud';
	}
}

export function conditionLabel(c: WeatherCondition | null): string {
	switch (c) {
		case 'clear':         return 'Clear';
		case 'partly-cloudy': return 'Partly cloudy';
		case 'cloudy':        return 'Cloudy';
		case 'fog':           return 'Fog';
		case 'rain':          return 'Rain';
		case 'snow':          return 'Snow';
		case 'thunderstorm':  return 'Thunderstorms';
		default:              return '—';
	}
}

export interface OpenMeteoDailyForecast {
	date: string;             // YYYY-MM-DD
	weatherCode: number | null;
	condition: WeatherCondition | null;
	tempHighF: number | null;
	tempLowF: number | null;
	precipProb: number | null;
	precipIn: number | null;
	precipSnowIn: number | null;
	windMph: number | null;
}

export async function fetchOpenMeteoDaily(lat: number, lon: number, days = 14): Promise<OpenMeteoDailyForecast[]> {
	const params = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		daily: [
			'weathercode',
			'temperature_2m_max',
			'temperature_2m_min',
			'precipitation_probability_max',
			'precipitation_sum',
			'snowfall_sum',
			'windspeed_10m_max',
		].join(','),
		temperature_unit: 'fahrenheit',
		windspeed_unit: 'mph',
		precipitation_unit: 'inch',
		timezone: 'America/Denver',
		forecast_days: String(Math.min(days, 16)),
	});
	const url = `${OPEN_METEO_BASE}?${params.toString()}`;
	const data = await fetchWithRetry(url);
	return parseOpenMeteoDaily(data);
}

export function parseOpenMeteoDaily(data: any): OpenMeteoDailyForecast[] {
	const daily = data?.daily;
	if (!daily?.time || !Array.isArray(daily.time)) return [];

	const out: OpenMeteoDailyForecast[] = [];
	for (let i = 0; i < daily.time.length; i++) {
		const code = daily.weathercode?.[i] ?? null;
		out.push({
			date: daily.time[i],
			weatherCode: typeof code === 'number' ? code : null,
			condition: wmoToCondition(typeof code === 'number' ? code : null),
			tempHighF: pickNum(daily.temperature_2m_max?.[i]),
			tempLowF: pickNum(daily.temperature_2m_min?.[i]),
			precipProb: pickNum(daily.precipitation_probability_max?.[i]),
			precipIn: pickNum(daily.precipitation_sum?.[i]),
			precipSnowIn: pickNum(daily.snowfall_sum?.[i]),
			windMph: pickNum(daily.windspeed_10m_max?.[i]),
		});
	}
	return out;
}

function pickNum(v: any): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Current-conditions + hourly weather
// ---------------------------------------------------------------------------

export interface OpenMeteoCurrentResult {
	current: {
		timestamp: string;
		tempF: number | null;
		humidityPct: number | null;
		windMph: number | null;
		weatherCode: number | null;
		condition: string | null;
		uvIndex: number | null;
		tempHighF: number | null;
		tempLowF: number | null;
	};
	hourly: Array<{
		timestamp: string;
		tempF: number | null;
		weatherCode: number | null;
		condition: string | null;
	}>;
}

/**
 * Pure parser — unit-testable without network.
 * Accepts the raw Open-Meteo JSON from a request that includes
 * current, hourly, and daily blocks.
 * Returns current conditions plus the next ~12 hourly rows.
 */
export function parseOpenMeteoHourlyCurrent(data: any): OpenMeteoCurrentResult {
	const cur = data?.current ?? {};
	const hourly = data?.hourly ?? {};
	const daily = data?.daily ?? {};

	const currentTs: string = cur.time ?? '';
	const curCode = typeof cur.weather_code === 'number' ? cur.weather_code : null;

	// Today's high/low from the first daily entry
	const tempHighF = pickNum(daily.temperature_2m_max?.[0]);
	const tempLowF  = pickNum(daily.temperature_2m_min?.[0]);
	const uvIndex   = pickNum(daily.uv_index_max?.[0]);

	const current = {
		timestamp:   currentTs,
		tempF:       pickNum(cur.temperature_2m),
		humidityPct: pickNum(cur.relative_humidity_2m),
		windMph:     pickNum(cur.wind_speed_10m),
		weatherCode: curCode,
		condition:   wmoToCondition(curCode),
		uvIndex,
		tempHighF,
		tempLowF,
	};

	// Build hourly rows, capped at 12 entries starting from the first entry
	const hourlyTimes: string[] = Array.isArray(hourly.time) ? hourly.time : [];
	const hourlyTemps: any[]    = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
	const hourlyCodes: any[]    = Array.isArray(hourly.weather_code) ? hourly.weather_code : [];

	const hourlyRows = hourlyTimes.slice(0, 12).map((ts, i) => {
		const code = typeof hourlyCodes[i] === 'number' ? hourlyCodes[i] : null;
		return {
			timestamp:   ts,
			tempF:       pickNum(hourlyTemps[i]),
			weatherCode: code,
			condition:   wmoToCondition(code),
		};
	});

	return { current, hourly: hourlyRows };
}

/**
 * Fetches current conditions + hourly + daily data for the given coordinates.
 * Does NOT affect the existing fetchOpenMeteoDaily function.
 */
export async function fetchOpenMeteoHourlyCurrent(lat: number, lng: number): Promise<OpenMeteoCurrentResult> {
	const params = new URLSearchParams({
		latitude:          String(lat),
		longitude:         String(lng),
		current:           'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
		hourly:            'temperature_2m,weather_code',
		daily:             'temperature_2m_max,temperature_2m_min,uv_index_max',
		temperature_unit:  'fahrenheit',
		wind_speed_unit:   'mph',
		timezone:          'America/Denver',
		forecast_days:     '2',
	});
	const url = `${OPEN_METEO_BASE}?${params.toString()}`;
	const data = await fetchWithRetry(url);
	return parseOpenMeteoHourlyCurrent(data);
}
