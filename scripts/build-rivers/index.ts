import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CURATED_RIVERS } from './curated';
import { fetchWikidataRivers } from './wikidata';
import { fetchAmericanWhitewaterRivers } from './american-whitewater';
import { dedupeAndFinalize } from './dedupe';
import type { PartialRiver } from './types';

async function main() {
	const dataDir = join(process.cwd(), 'data');
	if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

	console.log('=== Flow-State world-rivers build ===');
	const all: PartialRiver[] = [];

	// 1. Curated — quality anchors.
	console.log(`[curated] ${CURATED_RIVERS.length} hand-curated rivers`);
	all.push(...CURATED_RIVERS);

	// 2. Wikidata bulk pull.
	try {
		const wd = await fetchWikidataRivers();
		all.push(...wd);
	} catch (err) {
		console.warn(`[wikidata] FAILED: ${(err as Error).message}`);
	}

	// 3. American Whitewater (US coverage boost).
	try {
		const aw = await fetchAmericanWhitewaterRivers();
		all.push(...aw);
	} catch (err) {
		console.warn(`[american-whitewater] FAILED: ${(err as Error).message}`);
	}

	console.log(`[combined] ${all.length} raw entries before dedupe`);
	const records = dedupeAndFinalize(all);
	console.log(`[dedupe] ${records.length} unique rivers after dedupe`);

	// Write rivers.json with 2-space indent for diffability.
	const riversPath = join(dataDir, 'rivers.json');
	writeFileSync(riversPath, JSON.stringify(records, null, 2) + '\n');
	const rawBytes = Buffer.byteLength(JSON.stringify(records, null, 2));
	console.log(`[output] wrote ${records.length} rivers to ${riversPath} (${(rawBytes / 1024 / 1024).toFixed(2)} MB)`);

	// Summary
	const bySource: Record<string, number> = {};
	const byContinent: Record<string, number> = {};
	const byCountry: Record<string, number> = {};
	for (const r of records) {
		bySource[r.source] = (bySource[r.source] || 0) + 1;
		byContinent[r.continent] = (byContinent[r.continent] || 0) + 1;
		byCountry[r.country] = (byCountry[r.country] || 0) + 1;
	}
	const topCountries = Object.entries(byCountry)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 15)
		.map(([country, count]) => ({ country, count }));

	const summary = {
		generated_at: new Date().toISOString(),
		total: records.length,
		raw_bytes: rawBytes,
		by_source: bySource,
		by_continent: byContinent,
		by_country_top15: topCountries,
	};
	const summaryPath = join(dataDir, 'rivers.summary.json');
	writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
	console.log(`[output] wrote summary to ${summaryPath}`);
	console.log('=== done ===');
}

main().catch(err => {
	console.error('Pipeline failed:', err);
	process.exit(1);
});
