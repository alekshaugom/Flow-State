#!/usr/bin/env node
// Probe BOR RISE API to find current itemIds for Colorado reservoirs.
// One-off investigation script. Safe to delete after use.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const BASE = 'https://data.usbr.gov/rise/api';
const OUT = '/tmp/bor-probe';
if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

const TARGETS = [
	'blue mesa',
	'morrow point',
	'crystal',
	'taylor park',
	'pueblo',
	'twin lakes',
	'turquoise',
	'green mountain',
	'dillon',
	'ruedi',
	'mcphee',
];

async function getJson(url, retries = 3) {
	for (let i = 0; i < retries; i++) {
		try {
			const r = await fetch(url, {
				headers: { Accept: 'application/json', 'User-Agent': 'Flow-State/1.0 (research)' },
			});
			if (!r.ok) {
				if (r.status === 404) return { __notFound: true, __status: 404 };
				throw new Error(`HTTP ${r.status} ${r.statusText}`);
			}
			return await r.json();
		} catch (err) {
			if (i === retries - 1) throw err;
			console.error(`  retry ${i + 1} after error: ${err.message}`);
			await sleep(2000 * (i + 1));
		}
	}
}

async function fetchAllLocationPages() {
	const cache = path.join(OUT, 'locations.json');
	if (existsSync(cache)) {
		console.log('Using cached locations.json');
		return JSON.parse(await readFile(cache, 'utf8'));
	}
	const all = [];
	let page = 1;
	while (true) {
		console.log(`Fetching locations page ${page}...`);
		const url = `${BASE}/location?page=${page}&itemsPerPage=200&locationTypeName=Lake%2FReservoir`;
		const data = await getJson(url);
		const members = data['hydra:member'] || [];
		all.push(...members);
		console.log(`  total so far: ${all.length} / ${data['hydra:totalItems']}`);
		if (members.length < 200) break;
		page++;
		await sleep(1500);
	}
	await writeFile(cache, JSON.stringify(all, null, 2));
	return all;
}

function extractId(member) {
	// hydra members typically have either `id` or `@id` (URI like /rise/api/location/913)
	if (member.id != null) return String(member.id);
	const atId = member['@id'];
	if (atId) {
		const m = atId.match(/\/(\d+)\/?$/);
		if (m) return m[1];
	}
	return null;
}

function getName(member) {
	return member.attributes?.locationName || member.locationName || '';
}

async function main() {
	const locations = await fetchAllLocationPages();
	console.log(`\nTotal Lake/Reservoir locations: ${locations.length}\n`);

	// Filter for CO targets
	const co = [];
	for (const loc of locations) {
		const name = getName(loc).toLowerCase();
		const state = (loc.attributes?.locationRegionNames || []).join(' ').toLowerCase();
		const stateField = (loc.attributes?.state || '').toLowerCase();
		for (const t of TARGETS) {
			if (name.includes(t)) {
				co.push({
					id: extractId(loc),
					name: getName(loc),
					target: t,
					state: stateField,
					regions: loc.attributes?.locationRegionNames || [],
					attrs: loc.attributes,
				});
				break;
			}
		}
	}

	console.log('Matches (raw, may include non-CO duplicates):');
	for (const m of co) {
		console.log(`  [${m.target}] id=${m.id} name="${m.name}" state="${m.state}" regions=${JSON.stringify(m.regions)}`);
	}

	await writeFile(path.join(OUT, 'matches.json'), JSON.stringify(co, null, 2));
	console.log(`\nWrote /tmp/bor-probe/matches.json with ${co.length} matches.`);
}

main().catch((err) => {
	console.error('FATAL:', err);
	process.exit(1);
});
