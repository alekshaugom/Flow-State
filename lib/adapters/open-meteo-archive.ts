import { fetchWithRetry, isoDate } from '../utils.ts';
import { wmoToCondition, type WeatherCondition } from './open-meteo.ts';

const OPEN_METEO_ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';

export interface OpenMeteoDailyObservation {
	date: string;              // YYYY-MM-DD
	weatherCode: number | null;
	condition: WeatherCondition | null;
	tempHighF: number | null;
	tempLowF: number | null;
	precipIn: number | null;
	precipSnowIn: number | null;
	windMph: number | null;
}

export async function fetchArchiveDaily(
	lat: number,
	lon: number,
	startDate: Date,
	endDate: Date,
): Promise<OpenMeteoDailyObservation[]> {
	const params = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		start_date: isoDate(startDate),
		end_date: isoDate(endDate),
		daily: [
			'weather_code',
			'temperature_2m_max',
			'temperature_2m_min',
			'precipitation_sum',
			'snowfall_sum',
			'wind_speed_10m_max',
		].join(','),
		temperature_unit: 'fahrenheit',
		wind_speed_unit: 'mph',
		precipitation_unit: 'inch',
		timezone: 'America/Denver',
	});
	const url = `${OPEN_METEO_ARCHIVE_BASE}?${params.toString()}`;
	const data = await fetchWithRetry(url);
	return parseArchiveDaily(data);
}

/**
 * Parses an Open-Meteo Archive `/v1/archive` daily response.
 *
 * Tolerant of both snake_case (archive) and camelCase/compact (forecast) field names
 * so the same parser can ingest either shape without surprise.
 *
 * Response shape:
 *   { daily: { time: ["YYYY-MM-DD", ...], weather_code: [n, ...], temperature_2m_max: [n, ...], ... } }
 *
 * Each array is parallel to `daily.time` — index i across arrays describes day i.
 * Missing days come back as `null` in that index, not as gaps in `time`.
 *
 * Exported for testing — verifies L006 (response shape verification) without a live fetch.
 */
export function parseArchiveDaily(data: any): OpenMeteoDailyObservation[] {
	const daily = data?.daily;
	if (!daily?.time || !Array.isArray(daily.time)) return [];

	const weatherCodes = daily.weather_code ?? daily.weathercode;
	const wind = daily.wind_speed_10m_max ?? daily.windspeed_10m_max;

	const out: OpenMeteoDailyObservation[] = [];
	for (let i = 0; i < daily.time.length; i++) {
		const code = pickNum(weatherCodes?.[i]);
		out.push({
			date: daily.time[i],
			weatherCode: code,
			condition: wmoToCondition(code),
			tempHighF: pickNum(daily.temperature_2m_max?.[i]),
			tempLowF: pickNum(daily.temperature_2m_min?.[i]),
			precipIn: pickNum(daily.precipitation_sum?.[i]),
			precipSnowIn: pickNum(daily.snowfall_sum?.[i]),
			windMph: pickNum(wind?.[i]),
		});
	}
	return out;
}

function pickNum(v: any): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
