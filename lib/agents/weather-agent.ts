import { tables } from 'harper';
import { compositeId, isoNow } from '../utils.ts';
import { fetchOpenMeteoDaily, type OpenMeteoDailyForecast } from '../adapters/open-meteo.ts';

const PER_SECTION_DELAY_MS = 300;

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const r of iter) out.push(r);
	return out;
}

export async function runWeatherIngestion(): Promise<{ sectionsAttempted: number; rowsWritten: number; errors: string[] }> {
	const all = await collect(tables.RiverSection.search({ conditions: [] }));
	const sectionsWithLatLon = all.filter((s: any) => typeof s.latitude === 'number' && typeof s.longitude === 'number');

	const errors: string[] = [];
	let rowsWritten = 0;

	for (const section of sectionsWithLatLon) {
		try {
			const forecasts = await fetchOpenMeteoDaily((section as any).latitude, (section as any).longitude, 14);
			const capturedAt = isoNow();
			for (const f of forecasts) {
				await writeForecastRow(section.id, f, capturedAt);
				rowsWritten++;
			}
		} catch (err) {
			errors.push(`${section.id}: ${(err as Error).message}`);
		}
		await new Promise(r => setTimeout(r, PER_SECTION_DELAY_MS));
	}

	console.log(`[weather] ingested ${rowsWritten} forecast rows across ${sectionsWithLatLon.length} sections; ${errors.length} errors`);
	return { sectionsAttempted: sectionsWithLatLon.length, rowsWritten, errors };
}

async function writeForecastRow(sectionId: string, f: OpenMeteoDailyForecast, capturedAt: string): Promise<void> {
	const id = compositeId([sectionId, f.date]);
	await tables.WeatherForecast.put(id, {
		id,
		sectionId,
		date: f.date,
		tempHighF: f.tempHighF,
		tempLowF: f.tempLowF,
		sky: null,
		precipProb: f.precipProb,
		precipIn: f.precipIn,
		precipSnowIn: f.precipSnowIn,
		snowOrRain: f.condition === 'snow' ? 'snow' : (f.condition === 'rain' || f.condition === 'thunderstorm' ? 'rain' : null),
		windMph: f.windMph,
		weatherCode: f.weatherCode,
		condition: f.condition,
		source: 'open-meteo',
		capturedAt,
	});
}
