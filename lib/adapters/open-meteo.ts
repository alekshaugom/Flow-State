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
