// Computes river-mile for every access point, gauge, and impassable dam in
// scripts/access-points-draft.json by snapping their lat/lon onto the USGS
// NHDPlus HR flowline for each river. River-mile is cumulative distance (in
// statute miles) from the upstream-most curated point in each corridor.
//
// Reuses the NHD flowline assembly logic from scripts/generate-geometries.ts.
//
// Usage: node scripts/compute-river-miles.mjs
//   --rivers=arkansas,colorado  optional: limit to specific river IDs
//   --dry-run                   compute and report but don't write back

import { readFileSync, writeFileSync } from 'node:fs';

const JSON_PATH = '/Users/aleks/Flow-State/scripts/access-points-draft.json';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const riverFilterArg = args.find(a => a.startsWith('--rivers='));
const riverFilter = riverFilterArg ? new Set(riverFilterArg.split('=')[1].split(',')) : null;

const GNIS_BY_RIVER = {
	'arkansas': 'Arkansas River',
	'colorado': 'Colorado River',
	'eagle': 'Eagle River',
	'roaring-fork': 'Roaring Fork River',
	'blue': 'Blue River',
	'gunnison': 'Gunnison River',
	'yampa': 'Yampa River',
	'animas': 'Animas River',
	'dolores': 'Dolores River',
	'san-miguel': 'San Miguel River',
	'piedra': 'Piedra River',
	'san-juan': 'San Juan River',
	'clear-creek': 'Clear Creek',
	'cache-la-poudre': 'Cache la Poudre River',
	'south-platte': 'South Platte River',
	'north-platte': 'North Platte River',
};

// ── Geo math (mirrors scripts/generate-geometries.ts) ─────────────────

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

function haversineDistance(a, b) {
	const [lng1, lat1] = a;
	const [lng2, lat2] = b;
	const dLat = (lat2 - lat1) * DEG_TO_RAD;
	const dLng = (lng2 - lng1) * DEG_TO_RAD;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h = sinLat * sinLat + Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * sinLng * sinLng;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function projectPointOnSegment(p, a, b) {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	if (dx === 0 && dy === 0) return { fraction: 0, point: a, distance: haversineDistance(p, a) };
	let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
	t = Math.max(0, Math.min(1, t));
	const proj = [a[0] + t * dx, a[1] + t * dy];
	return { fraction: t, point: proj, distance: haversineDistance(p, proj) };
}

function projectPointOnLine(point, coords) {
	let best = { index: 0, fraction: 0, point: coords[0], distance: Infinity };
	for (let i = 0; i < coords.length - 1; i++) {
		const proj = projectPointOnSegment(point, coords[i], coords[i + 1]);
		if (proj.distance < best.distance) {
			best = { index: i, fraction: proj.fraction, point: proj.point, distance: proj.distance };
		}
	}
	return best;
}

// Cumulative distance (meters) from coords[0] to the projected point.
function cumulativeDistanceTo(coords, projection) {
	let total = 0;
	for (let i = 0; i < projection.index; i++) {
		total += haversineDistance(coords[i], coords[i + 1]);
	}
	const segLen = haversineDistance(coords[projection.index], coords[projection.index + 1]);
	total += segLen * projection.fraction;
	return total;
}

// ── NHDPlus client ─────────────────────────────────────────────────────

const NHD_BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/3/query';
const MAX_RECORDS = 2000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, retries = 3) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			const data = await res.json();
			if (data.error) throw new Error(`ArcGIS error: ${data.error.message}`);
			return data;
		} catch (err) {
			if (attempt === retries) throw err;
			console.warn(`  retry ${attempt}/${retries}: ${err.message}`);
			await sleep(1000 * attempt);
		}
	}
}

async function queryFlowlines(gnisName, bbox) {
	const where = `gnis_name='${gnisName.replace(/'/g, "''")}'`;
	const allFeatures = [];
	let offset = 0;
	for (let page = 0; page < 10; page++) {
		const params = new URLSearchParams({
			where,
			geometry: JSON.stringify(bbox),
			geometryType: 'esriGeometryEnvelope',
			inSR: '4326', outSR: '4326',
			spatialRel: 'esriSpatialRelIntersects',
			outFields: 'OBJECTID,gnis_name,lengthkm,ftype,streamorde,hydroseq,levelpathi,fromnode,tonode',
			f: 'geojson',
			returnGeometry: 'true',
			resultRecordCount: String(MAX_RECORDS),
			resultOffset: String(offset),
		});
		const data = await fetchJson(`${NHD_BASE}?${params}`);
		if (data.features) allFeatures.push(...data.features);
		if (!data.exceededTransferLimit && (!data.properties || !data.properties.exceededTransferLimit)) break;
		offset += MAX_RECORDS;
		await sleep(300);
	}
	return allFeatures;
}

// ── Flowline assembly ──────────────────────────────────────────────────

function featureClosestDist(f, point) {
	let m = Infinity;
	for (const c of f.geometry.coordinates) {
		const d = haversineDistance(point, c);
		if (d < m) m = d;
	}
	return m;
}

function assembleMainStem(features, upstreamPoint, downstreamPoint) {
	const valid = features.filter(f =>
		(f.properties.ftype === 460 || f.properties.ftype === 558) &&
		f.geometry?.type === 'LineString' &&
		f.geometry.coordinates.length >= 2
	);
	if (valid.length === 0) return [];

	const byFromNode = new Map();
	const byToNode = new Map();
	for (const f of valid) {
		const fn = f.properties.fromnode;
		const tn = f.properties.tonode;
		if (!byFromNode.has(fn)) byFromNode.set(fn, []);
		byFromNode.get(fn).push(f);
		if (!byToNode.has(tn)) byToNode.set(tn, []);
		byToNode.get(tn).push(f);
	}

	// Pick the start feature (nearest to upstream anchor)
	let startFeature = valid[0];
	let minDist = Infinity;
	for (const f of valid) {
		const d = featureClosestDist(f, upstreamPoint);
		if (d < minDist) { minDist = d; startFeature = f; }
	}
	// Pick the end feature (nearest to downstream anchor)
	let endFeature = valid[0];
	minDist = Infinity;
	for (const f of valid) {
		const d = featureClosestDist(f, downstreamPoint);
		if (d < minDist) { minDist = d; endFeature = f; }
	}

	// Trace downstream from start to end via tonode → fromnode chain.
	const visited = new Set([startFeature.properties.OBJECTID]);
	const path = [startFeature];
	let current = startFeature;
	const maxSteps = valid.length + 10;
	let steps = 0;

	while (current.properties.OBJECTID !== endFeature.properties.OBJECTID && steps < maxSteps) {
		steps++;
		const downstream = byFromNode.get(current.properties.tonode);
		if (!downstream) break;
		let next = null;
		let nextScore = -1;
		for (const f of downstream) {
			if (visited.has(f.properties.OBJECTID)) continue;
			let score = f.properties.streamorde * 100;
			if (f.properties.gnis_name === startFeature.properties.gnis_name) score += 1000;
			if (score > nextScore) { nextScore = score; next = f; }
		}
		if (!next) break;
		visited.add(next.properties.OBJECTID);
		path.push(next);
		current = next;
	}

	// If downstream trace didn't reach end, try reverse (in case put/take flipped).
	if (current.properties.OBJECTID !== endFeature.properties.OBJECTID) {
		const upVisited = new Set([startFeature.properties.OBJECTID]);
		const upPath = [startFeature];
		let upCurrent = startFeature;
		steps = 0;
		while (upCurrent.properties.OBJECTID !== endFeature.properties.OBJECTID && steps < maxSteps) {
			steps++;
			const upstream = byToNode.get(upCurrent.properties.fromnode);
			if (!upstream) break;
			let next = null;
			let nextScore = -1;
			for (const f of upstream) {
				if (upVisited.has(f.properties.OBJECTID)) continue;
				let score = f.properties.streamorde * 100;
				if (f.properties.gnis_name === startFeature.properties.gnis_name) score += 1000;
				if (score > nextScore) { nextScore = score; next = f; }
			}
			if (!next) break;
			upVisited.add(next.properties.OBJECTID);
			upPath.push(next);
			upCurrent = next;
		}
		if (upCurrent.properties.OBJECTID === endFeature.properties.OBJECTID) {
			path.length = 0;
			path.push(...upPath.reverse());
		}
	}

	// Fallback: hydroseq sort on the dominant level path.
	if (path.length < 2 || path[path.length - 1].properties.OBJECTID !== endFeature.properties.OBJECTID) {
		const byLevelPath = new Map();
		for (const f of valid) {
			const lp = f.properties.levelpathi;
			if (!byLevelPath.has(lp)) byLevelPath.set(lp, []);
			byLevelPath.get(lp).push(f);
		}
		let bestPath = [];
		let bestScore = -1;
		for (const [, group] of byLevelPath) {
			const maxOrder = Math.max(...group.map(f => f.properties.streamorde));
			const totalLen = group.reduce((s, f) => s + f.properties.lengthkm, 0);
			const score = maxOrder * 1000 + totalLen;
			if (score > bestScore) { bestScore = score; bestPath = group; }
		}
		bestPath.sort((a, b) => b.properties.hydroseq - a.properties.hydroseq);
		path.length = 0;
		path.push(...bestPath);
	}

	// Concatenate respecting direction (reverse a segment if its end is closer to last coord).
	const coords = [];
	for (const f of path) {
		const seg = f.geometry.coordinates;
		if (coords.length === 0) { coords.push(...seg); continue; }
		const last = coords[coords.length - 1];
		const fwd = haversineDistance(last, seg[0]);
		const rev = haversineDistance(last, seg[seg.length - 1]);
		const ordered = rev < fwd ? [...seg].reverse() : seg;
		const gap = haversineDistance(last, ordered[0]);
		if (gap < 100) coords.push(...ordered.slice(1));
		else coords.push(...ordered);
	}
	return coords;
}

// ── Main per-river ─────────────────────────────────────────────────────

const M_PER_MILE = 1609.344;

async function processRiver(riverId, riverData) {
	const gnis = GNIS_BY_RIVER[riverId];
	if (!gnis) {
		console.log(`  skip: no GNIS mapping for ${riverId}`);
		return;
	}

	// Collect every point with coords (APs + gauges + dams).
	const points = [];
	for (const ap of riverData.accessPoints || []) {
		if (ap.latitude != null && ap.longitude != null) {
			points.push({ kind: 'ap', ref: ap, lonlat: [ap.longitude, ap.latitude] });
		}
	}
	for (const g of riverData.gauges || []) {
		if (g.latitude != null && g.longitude != null) {
			points.push({ kind: 'gauge', ref: g, lonlat: [g.longitude, g.latitude] });
		}
	}
	for (const d of riverData.impassableDams || []) {
		if (d.latitude != null && d.longitude != null) {
			points.push({ kind: 'dam', ref: d, lonlat: [d.longitude, d.latitude] });
		}
	}

	if (points.length < 2) {
		console.log(`  skip: only ${points.length} geo-located points`);
		return;
	}

	const lons = points.map(p => p.lonlat[0]);
	const lats = points.map(p => p.lonlat[1]);
	const bbox = {
		xmin: Math.min(...lons) - 0.15,
		ymin: Math.min(...lats) - 0.15,
		xmax: Math.max(...lons) + 0.15,
		ymax: Math.max(...lats) + 0.15,
	};
	console.log(`  ${points.length} points, bbox ${bbox.xmin.toFixed(2)},${bbox.ymin.toFixed(2)} → ${bbox.xmax.toFixed(2)},${bbox.ymax.toFixed(2)}`);

	let features;
	try {
		features = await queryFlowlines(gnis, bbox);
	} catch (err) {
		console.warn(`  NHDPlus query failed: ${err.message}`);
		return;
	}
	if (features.length === 0) {
		console.warn(`  no NHDPlus features for "${gnis}" in bbox`);
		return;
	}
	console.log(`  fetched ${features.length} flowline segments`);

	// Anchor: project all points first, find the one with smallest cumulative distance
	// from the start of the assembled line. The upstream-most point becomes river-mile 0.
	const apsByOrder = (riverData.accessPoints || [])
		.filter(a => a.latitude != null && a.longitude != null);
	if (apsByOrder.length === 0) {
		console.warn(`  no APs with coords — can't anchor`);
		return;
	}
	const upstreamAnchor = apsByOrder[0]; // first AP in JSON order = upstream
	const downstreamAnchor = apsByOrder[apsByOrder.length - 1];
	const upstreamLonLat = [upstreamAnchor.longitude, upstreamAnchor.latitude];
	const downstreamLonLat = [downstreamAnchor.longitude, downstreamAnchor.latitude];

	const flowline = assembleMainStem(features, upstreamLonLat, downstreamLonLat);
	if (flowline.length < 2) {
		console.warn(`  could not assemble flowline`);
		return;
	}
	console.log(`  flowline assembled: ${flowline.length} vertices`);

	const upstreamProj = projectPointOnLine(upstreamLonLat, flowline);
	const upstreamCumulative = cumulativeDistanceTo(flowline, upstreamProj);

	let updated = 0;
	let skippedFar = 0;
	let skippedUpstream = 0;
	for (const p of points) {
		const proj = projectPointOnLine(p.lonlat, flowline);
		if (proj.distance > 5000) {
			skippedFar++;
			console.warn(`  ${p.kind} "${p.ref.name}" is ${(proj.distance / 1000).toFixed(1)}km from flowline — skipping`);
			continue;
		}
		const cum = cumulativeDistanceTo(flowline, proj);
		const riverMileM = cum - upstreamCumulative;
		// Points that project upstream of the corridor anchor get null river-mile
		// (would otherwise be misleadingly clamped to 0).
		if (riverMileM < -100) {
			skippedUpstream++;
			p.ref.riverMile = null;
			continue;
		}
		const riverMile = Math.max(0, riverMileM / M_PER_MILE);
		p.ref.riverMile = Math.round(riverMile * 100) / 100;
		updated++;
	}
	console.log(`  ✓ updated ${updated}/${points.length}; skipped ${skippedFar} far + ${skippedUpstream} above-anchor`);
}

async function main() {
	const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
	const riverIds = Object.keys(data.rivers);

	for (const riverId of riverIds) {
		if (riverFilter && !riverFilter.has(riverId)) continue;
		console.log(`\n[${riverId}]`);
		try {
			await processRiver(riverId, data.rivers[riverId]);
		} catch (err) {
			console.error(`  FAILED: ${err.message}`);
		}
		await sleep(500);
	}

	if (!dryRun) {
		writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
		console.log(`\n✓ Wrote ${JSON_PATH}`);
	} else {
		console.log(`\n(dry-run; not writing)`);
	}
}

main().catch(err => {
	console.error('\nFatal:', err);
	process.exit(1);
});
