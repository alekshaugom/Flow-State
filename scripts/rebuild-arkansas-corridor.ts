/**
 * rebuild-arkansas-corridor.ts
 *
 * Phase 2 of the Arkansas Headwaters corridor rebuild.
 *
 * 1. Fetches OSM river geometry via Overpass API (cached).
 * 2. Stitches ways into a single master polyline (upstream → downstream).
 * 3. Snaps curated access points to the master polyline.
 * 4. Validates section ordering (put-in upstream of take-out).
 * 5. Slices per-section sub-polylines.
 * 6. Writes app/src/lib/river-geometries.ts and updates riverMile fields
 *    in lib/curated-river-data.ts.
 *
 * Usage: npx tsx scripts/rebuild-arkansas-corridor.ts
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_ACCESS_POINTS, SECTION_LEG_MAPPING } from '../lib/curated-river-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Types ────────────────────────────────────────────────────────────

type Coord = [number, number]; // [lng, lat]

interface OsmNode {
    type: 'node';
    id: number;
    lat: number;
    lon: number;
}

interface OsmWay {
    type: 'way';
    id: number;
    nodes: number[];
    tags?: Record<string, string>;
}

type OsmElement = OsmNode | OsmWay;

interface OsmResponse {
    elements: OsmElement[];
}

interface SnapResult {
    apId: string;
    name: string;
    snapIdx: number;
    riverMile: number;
    offRiverDistanceMiles: number;
    lat: number;
    lng: number;
}

// ── Constants ────────────────────────────────────────────────────────

const CACHE_PATH = resolve(__dirname, 'cache/arkansas-river-osm.json');
const MASTER_PATH = resolve(PROJECT_ROOT, 'app/src/data/arkansas-headwaters-master.json');
const GEOMETRIES_PATH = resolve(PROJECT_ROOT, 'app/src/lib/river-geometries.ts');
const CURATED_DATA_PATH = resolve(PROJECT_ROOT, 'lib/curated-river-data.ts');

// OSM bbox: (south, west, north, east)
const OVERPASS_BBOX = '38.20,-106.40,39.10,-104.70';
const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';

// Granite upstream anchor
const GRANITE_LAT = 39.0436;
const GRANITE_LNG = -106.26528;

// Target Arkansas section IDs to replace in river-geometries.ts
const ARKANSAS_SECTION_IDS = [
    'arkansas-pine-creek',
    'arkansas-numbers',
    'arkansas-fractions',
    'arkansas-town-boat-chute',
    'arkansas-milk-run',
    'arkansas-browns-upper',
    'arkansas-browns-lower',
    'arkansas-big-bend',
    'arkansas-bighorn-sheep',
    'arkansas-royal-gorge',
    'arkansas-canon-to-reservoir',
    'arkansas-bighorn-sheep-upper', // NEW
];

// ── Haversine distance ───────────────────────────────────────────────

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3958.8; // Earth radius miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Step 1: Fetch OSM data ────────────────────────────────────────────

async function fetchOsmData(): Promise<OsmResponse> {
    if (existsSync(CACHE_PATH)) {
        console.log(`  Using cached OSM data: ${CACHE_PATH}`);
        const raw = await readFile(CACHE_PATH, 'utf8');
        return JSON.parse(raw) as OsmResponse;
    }

    console.log('  Fetching OSM data from Overpass API...');
    const query = `
[out:json][timeout:120];
(
  way["waterway"="river"]["name"="Arkansas River"](${OVERPASS_BBOX});
);
out body;
>;
out skel qt;
`.trim();

    const body = `data=${encodeURIComponent(query)}`;
    const resp = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!resp.ok) {
        throw new Error(`Overpass API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json() as OsmResponse;

    await mkdir(resolve(__dirname, 'cache'), { recursive: true });
    await writeFile(CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  Cached to ${CACHE_PATH}`);

    return data;
}

// ── Step 2: Stitch ways into master polyline ─────────────────────────

function stitchWays(osmData: OsmResponse): Coord[] {
    // Build lookup: nodeId → {lat, lon}
    const nodeCoords = new Map<number, { lat: number; lon: number }>();
    const ways: OsmWay[] = [];

    for (const el of osmData.elements) {
        if (el.type === 'node') {
            nodeCoords.set(el.id, { lat: el.lat, lon: el.lon });
        } else if (el.type === 'way') {
            ways.push(el);
        }
    }

    console.log(`  OSM elements: ${osmData.elements.length} total, ${ways.length} ways, ${nodeCoords.size} nodes`);

    // Build adjacency: endpointNodeId → ways that have it as first or last node
    const endpointToWays = new Map<number, OsmWay[]>();
    for (const way of ways) {
        if (way.nodes.length < 2) continue;
        const first = way.nodes[0];
        const last = way.nodes[way.nodes.length - 1];
        for (const nodeId of [first, last]) {
            if (!endpointToWays.has(nodeId)) endpointToWays.set(nodeId, []);
            endpointToWays.get(nodeId)!.push(way);
        }
    }

    // Find the upstream start: the "dead end" endpoint (connected to exactly 1 way)
    // that is closest to Granite. Dead-end endpoints are the true termini of the river
    // chain — intermediate junction nodes connect 2+ ways.
    let bestNodeId = -1;
    let bestDist = Infinity;

    for (const [nodeId, wayList] of endpointToWays) {
        // Dead-end: connected to exactly 1 way (true start or end of the chain)
        if (wayList.length !== 1) continue;
        const coord = nodeCoords.get(nodeId);
        if (!coord) continue;
        const d = haversineMiles(GRANITE_LAT, GRANITE_LNG, coord.lat, coord.lon);
        if (d < bestDist) {
            bestDist = d;
            bestNodeId = nodeId;
        }
    }

    if (bestNodeId === -1) throw new Error('Could not find upstream start node near Granite');
    const startCoord = nodeCoords.get(bestNodeId)!;
    console.log(`  Upstream start node ${bestNodeId} at (${startCoord.lat.toFixed(5)}, ${startCoord.lon.toFixed(5)}), ${bestDist.toFixed(3)} mi from Granite`);

    // Greedy walk
    const usedWayIds = new Set<number>();
    const masterCoords: Coord[] = [];
    let currentEndNodeId = bestNodeId;

    // Determine if the starting node of the first way is our start; if we need to go the other direction
    // Find the first way to walk from bestNodeId
    let iterations = 0;
    const MAX_ITER = ways.length + 10;

    while (iterations++ < MAX_ITER) {
        const candidateWays = endpointToWays.get(currentEndNodeId) ?? [];
        const nextWays = candidateWays.filter(w => !usedWayIds.has(w.id));

        if (nextWays.length === 0) break;

        let chosenWay: OsmWay;
        if (nextWays.length === 1) {
            chosenWay = nextWays[0];
        } else {
            // Branch: pick the way whose OTHER endpoint is further downstream
            // Arkansas goes south until ~Salida (~38.5° lat) then east
            // "downstream" = lower latitude while lat > 38.5, else more eastern longitude
            chosenWay = pickDownstreamBranch(nextWays, currentEndNodeId, nodeCoords);
            const otherIds = nextWays.filter(w => w.id !== chosenWay.id).map(w => w.id);
            console.log(`  BRANCH at node ${currentEndNodeId}: chose way ${chosenWay.id}, skipped [${otherIds.join(',')}]`);
        }

        usedWayIds.add(chosenWay.id);

        // Determine direction: if chosenWay.nodes[0] == currentEndNodeId, forward; else reverse
        const forward = chosenWay.nodes[0] === currentEndNodeId;
        const orderedNodes = forward ? chosenWay.nodes : [...chosenWay.nodes].reverse();

        // Check for gap: does the first node of this way match currentEndNodeId?
        const connectingNodeId = orderedNodes[0];
        if (connectingNodeId !== currentEndNodeId) {
            // This should not happen given our logic, but guard anyway
            const gapFrom = nodeCoords.get(currentEndNodeId)!;
            const gapTo = nodeCoords.get(connectingNodeId)!;
            const gapMi = haversineMiles(gapFrom.lat, gapFrom.lon, gapTo.lat, gapTo.lon);
            if (gapMi > 0.5) {
                throw new Error(`Disconnected segment gap of ${gapMi.toFixed(2)} mi between node ${currentEndNodeId} and ${connectingNodeId} — aborting`);
            }
            console.warn(`  WARNING: Small gap of ${gapMi.toFixed(3)} mi bridged between nodes ${currentEndNodeId} → ${connectingNodeId}`);
            // Bridge with straight line — add the gap-to coord
            masterCoords.push([gapTo.lon, gapTo.lat]);
        }

        // Append way coords (skip first node if it matches current end to avoid duplicate)
        const startIdx = (masterCoords.length === 0) ? 0 : 1;
        for (let i = startIdx; i < orderedNodes.length; i++) {
            const nc = nodeCoords.get(orderedNodes[i]);
            if (!nc) {
                console.warn(`  WARNING: Node ${orderedNodes[i]} coords missing — skipping`);
                continue;
            }
            masterCoords.push([nc.lon, nc.lat]);
        }

        // Update current end to the last node of this way
        currentEndNodeId = orderedNodes[orderedNodes.length - 1];
    }

    const skippedWays = ways.filter(w => !usedWayIds.has(w.id));
    if (skippedWays.length > 0) {
        console.warn(`  WARNING: ${skippedWays.length} OSM ways were NOT included in the master polyline (disconnected segments)`);
        for (const w of skippedWays.slice(0, 5)) {
            const first = nodeCoords.get(w.nodes[0]);
            const last = nodeCoords.get(w.nodes[w.nodes.length - 1]);
            console.warn(`    way ${w.id}: nodes[0]=(${first?.lat.toFixed(4)},${first?.lon.toFixed(4)}), nodes[-1]=(${last?.lat.toFixed(4)},${last?.lon.toFixed(4)})`);
        }
    }

    return masterCoords;
}

function pickDownstreamBranch(
    ways: OsmWay[],
    currentNodeId: number,
    nodeCoords: Map<number, { lat: number; lon: number }>,
): OsmWay {
    // For each way, find the "other" endpoint (not currentNodeId)
    // Score by how far downstream it is
    // Arkansas: lat decreases southward to Salida, then heads east
    // Use a combined score: bigger latitude drop (or more eastern lon) = more downstream

    const currentCoord = nodeCoords.get(currentNodeId)!;

    let bestWay = ways[0];
    let bestScore = -Infinity;

    for (const way of ways) {
        const first = way.nodes[0];
        const last = way.nodes[way.nodes.length - 1];
        const otherNodeId = (first === currentNodeId) ? last : first;
        const otherCoord = nodeCoords.get(otherNodeId);
        if (!otherCoord) continue;

        // Score: lower lat is more downstream; after ~Salida (38.5°) eastern lon takes over
        // Simple heuristic: maximize lat drop + small east bias
        const latDrop = currentCoord.lat - otherCoord.lat; // positive = going south
        const lngIncrease = otherCoord.lon - currentCoord.lon; // positive = going east

        let score: number;
        if (currentCoord.lat > 38.55) {
            // Above Salida: prioritize going south
            score = latDrop * 10 + lngIncrease;
        } else {
            // Below Salida: prioritize going east
            score = lngIncrease * 10 + latDrop;
        }

        if (score > bestScore) {
            bestScore = score;
            bestWay = way;
        }
    }

    return bestWay;
}

// ── Step 3: Snap access points ────────────────────────────────────────

function buildCumulativeMiles(masterCoords: Coord[]): number[] {
    const cumMiles = [0];
    for (let i = 1; i < masterCoords.length; i++) {
        const [lng1, lat1] = masterCoords[i - 1];
        const [lng2, lat2] = masterCoords[i];
        cumMiles.push(cumMiles[i - 1] + haversineMiles(lat1, lng1, lat2, lng2));
    }
    return cumMiles;
}

function snapAccessPoints(masterCoords: Coord[], cumMiles: number[]): Map<string, SnapResult> {
    const arkAPs = CURATED_ACCESS_POINTS.filter(
        ap => ap.corridorId === 'arkansas-headwaters' && ap.latitude != null && ap.longitude != null,
    );

    const results = new Map<string, SnapResult>();

    for (const ap of arkAPs) {
        const apLat = ap.latitude!;
        const apLng = ap.longitude!;

        let bestIdx = 0;
        let bestDist = Infinity;

        for (let i = 0; i < masterCoords.length; i++) {
            const [lng, lat] = masterCoords[i];
            const d = haversineMiles(apLat, apLng, lat, lng);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }

        const riverMile = cumMiles[bestIdx];

        if (bestDist > 5) {
            throw new Error(
                `AP "${ap.name}" (${ap.id}) snapped ${bestDist.toFixed(2)} mi off river — coords are likely wrong. Aborting.`
            );
        }
        if (bestDist > 2) {
            console.warn(`  WARNING: AP "${ap.name}" snapped ${bestDist.toFixed(2)} mi off river — verify coords`);
        }

        results.set(ap.id, {
            apId: ap.id,
            name: ap.name,
            snapIdx: bestIdx,
            riverMile: Math.round(riverMile * 100) / 100,
            offRiverDistanceMiles: Math.round(bestDist * 1000) / 1000,
            lat: apLat,
            lng: apLng,
        });
    }

    return results;
}

// ── Step 4: Validate section ordering ────────────────────────────────

function validateSectionOrdering(snapMap: Map<string, SnapResult>): Set<string> {
    const validSections = new Set<string>();

    for (const sectionId of ARKANSAS_SECTION_IDS) {
        const leg = SECTION_LEG_MAPPING[sectionId];
        if (!leg) {
            console.warn(`  WARNING: No SECTION_LEG_MAPPING entry for "${sectionId}" — skipping`);
            continue;
        }

        const { fromAccessPointId, toAccessPointId } = leg;
        if (!fromAccessPointId || !toAccessPointId) {
            console.warn(`  WARNING: Section "${sectionId}" has null AP ids — skipping`);
            continue;
        }

        const fromAP = snapMap.get(fromAccessPointId);
        const toAP = snapMap.get(toAccessPointId);

        if (!fromAP) {
            console.error(`  ERROR: Section "${sectionId}" fromAP "${fromAccessPointId}" not found in snap results`);
            continue;
        }
        if (!toAP) {
            console.error(`  ERROR: Section "${sectionId}" toAP "${toAccessPointId}" not found in snap results`);
            continue;
        }

        if (fromAP.snapIdx >= toAP.snapIdx) {
            console.error(
                `  ERROR: Section "${sectionId}" ordering FAILED — put-in "${fromAP.name}" snapIdx=${fromAP.snapIdx} (${fromAP.riverMile} mi) is NOT upstream of take-out "${toAP.name}" snapIdx=${toAP.snapIdx} (${toAP.riverMile} mi)`
            );
            continue;
        }

        validSections.add(sectionId);
    }

    return validSections;
}

// ── Step 5: Slice per-section sub-polylines ───────────────────────────

function sliceSections(
    masterCoords: Coord[],
    snapMap: Map<string, SnapResult>,
    validSections: Set<string>,
): Map<string, Coord[]> {
    const sectionGeometries = new Map<string, Coord[]>();

    for (const sectionId of ARKANSAS_SECTION_IDS) {
        if (!validSections.has(sectionId)) continue;

        const leg = SECTION_LEG_MAPPING[sectionId]!;
        const fromAP = snapMap.get(leg.fromAccessPointId!)!;
        const toAP = snapMap.get(leg.toAccessPointId!)!;

        const slice = masterCoords.slice(fromAP.snapIdx, toAP.snapIdx + 1);
        sectionGeometries.set(sectionId, slice);
    }

    return sectionGeometries;
}

// ── Step 6a: Update river-geometries.ts ──────────────────────────────

function formatCoordArray(coords: Coord[], indent = '    '): string {
    return coords.map(([lng, lat]) => `${indent}[${lng.toFixed(5)}, ${lat.toFixed(5)}],`).join('\n');
}

async function updateRiverGeometries(
    sectionGeometries: Map<string, Coord[]>,
    cumMiles: number[],
    snapMap: Map<string, SnapResult>,
): Promise<void> {
    const raw = await readFile(GEOMETRIES_PATH, 'utf8');
    const lines = raw.split('\n');

    // Find all existing Arkansas section ranges to remove/replace
    // Strategy: find the line range for each section we care about,
    // then reconstruct the file.

    // Parse the file to find section start/end lines
    // A section looks like:  '  section-id': [\n ...\n  ],
    const sectionRanges = new Map<string, { startLine: number; endLine: number }>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match: optional spaces + 'section-id': [
        const m = line.match(/^\s+'([^']+)':\s*\[/);
        if (!m) continue;
        const id = m[1];
        if (!ARKANSAS_SECTION_IDS.includes(id)) continue;

        // Find the closing ]
        let depth = 0;
        let endLine = i;
        for (let j = i; j < lines.length; j++) {
            for (const ch of lines[j]) {
                if (ch === '[') depth++;
                else if (ch === ']') depth--;
            }
            if (depth === 0) {
                endLine = j;
                break;
            }
        }

        sectionRanges.set(id, { startLine: i, endLine });
    }

    // Also need to handle 'arkansas-bighorn-sheep-upper' which may NOT exist yet
    // Build the new file by reconstructing:
    // - everything before the first Arkansas section we touch
    // - replace each touched section with new content
    // - skip ranges for sections we're replacing
    // - append the new arkansas-bighorn-sheep-upper if not present

    // Collect all ranges sorted by start line
    const sortedRanges = [...sectionRanges.entries()]
        .sort((a, b) => a[1].startLine - b[1].startLine);

    const outputLines: string[] = [];
    let cursor = 0;

    for (const [sectionId, { startLine, endLine }] of sortedRanges) {
        // Copy lines from cursor up to (but not including) this section's start
        for (let i = cursor; i < startLine; i++) {
            outputLines.push(lines[i]);
        }

        // If we have new geometry for this section, insert it
        if (sectionGeometries.has(sectionId)) {
            const coords = sectionGeometries.get(sectionId)!;
            outputLines.push(`  '${sectionId}': [`);
            outputLines.push(formatCoordArray(coords));
            outputLines.push(`  ],`);
        }
        // else: section is omitted (shouldn't happen for valid sections)

        cursor = endLine + 1;
    }

    // Copy remaining lines after the last replaced section
    for (let i = cursor; i < lines.length; i++) {
        outputLines.push(lines[i]);
    }

    // If 'arkansas-bighorn-sheep-upper' was NOT already in the file, insert it
    // near 'arkansas-bighorn-sheep'
    const hasBigsheepUpper = sectionRanges.has('arkansas-bighorn-sheep-upper');
    if (!hasBigsheepUpper && sectionGeometries.has('arkansas-bighorn-sheep-upper')) {
        // Find where 'arkansas-bighorn-sheep' ends in the new output, insert after
        const coords = sectionGeometries.get('arkansas-bighorn-sheep-upper')!;
        const newEntry = [`  'arkansas-bighorn-sheep-upper': [`, formatCoordArray(coords), `  ],`].join('\n');

        const bigsheeepIdx = outputLines.findIndex(l => l.match(/^\s+'arkansas-bighorn-sheep':\s*\[/));
        if (bigsheeepIdx !== -1) {
            // Find its closing ], line
            let depth = 0;
            let endIdx = bigsheeepIdx;
            for (let j = bigsheeepIdx; j < outputLines.length; j++) {
                for (const ch of outputLines[j]) {
                    if (ch === '[') depth++;
                    else if (ch === ']') depth--;
                }
                if (depth === 0) {
                    endIdx = j;
                    break;
                }
            }
            // Insert after endIdx
            outputLines.splice(endIdx + 1, 0, '', newEntry);
        } else {
            console.warn(`  WARNING: Could not find 'arkansas-bighorn-sheep' in output to insert 'arkansas-bighorn-sheep-upper' after it`);
        }
    }

    // Verify Colorado entries are still present
    const newContent = outputLines.join('\n');
    for (const id of ['colorado-pumphouse', 'colorado-gore-canyon', 'colorado-shoshone']) {
        if (!newContent.includes(`'${id}':`)) {
            throw new Error(`SAFETY: Colorado entry '${id}' disappeared from river-geometries.ts — aborting write`);
        }
    }
    // Verify arkansas-pueblo-mup and arkansas-browns-canyon survive
    for (const id of ['arkansas-pueblo-mup', 'arkansas-browns-canyon']) {
        if (!newContent.includes(`'${id}':`)) {
            console.warn(`  NOTE: '${id}' not found in output (may be expected if not in original)`);
        }
    }

    await writeFile(GEOMETRIES_PATH, newContent, 'utf8');
    console.log(`  Wrote ${GEOMETRIES_PATH}`);
}

// ── Step 6b: Update riverMile fields in curated-river-data.ts ────────

async function updateCuratedRiverMiles(snapMap: Map<string, SnapResult>): Promise<void> {
    let raw = await readFile(CURATED_DATA_PATH, 'utf8');

    let updateCount = 0;
    for (const snap of snapMap.values()) {
        // Find the AP entry by id and update its riverMile
        // Pattern: within a block containing "id": "ap_id", find "riverMile": <number>
        // Use a regex that matches the riverMile line near this AP id
        // Strategy: find the block for this AP and replace riverMile value

        const idPattern = `"id": "${snap.apId}"`;
        const idIdx = raw.indexOf(idPattern);
        if (idIdx === -1) {
            console.warn(`  WARNING: Could not find AP "${snap.apId}" in curated-river-data.ts — skipping riverMile update`);
            continue;
        }

        // Find "riverMile": <value> after idIdx, before the next AP entry (next occurrence of "id":)
        const nextIdIdx = raw.indexOf('"id":', idIdx + idPattern.length);
        const blockEnd = nextIdIdx === -1 ? raw.length : nextIdIdx;
        const block = raw.slice(idIdx, blockEnd);

        const riverMilePattern = /"riverMile":\s*[\d.]+/;
        const newRiverMile = `"riverMile": ${snap.riverMile.toFixed(2)}`;

        if (!riverMilePattern.test(block)) {
            console.warn(`  WARNING: Could not find "riverMile" for "${snap.apId}" — skipping`);
            continue;
        }

        const updatedBlock = block.replace(riverMilePattern, newRiverMile);
        raw = raw.slice(0, idIdx) + updatedBlock + raw.slice(blockEnd);
        updateCount++;
    }

    await writeFile(CURATED_DATA_PATH, raw, 'utf8');
    console.log(`  Updated ${updateCount} riverMile values in ${CURATED_DATA_PATH}`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
    console.log('\n═══════════════════════════════════════════');
    console.log(' Arkansas Headwaters Corridor Rebuild');
    console.log('═══════════════════════════════════════════\n');

    // Step 1: Fetch OSM
    console.log('Step 1: Fetching OSM data...');
    const osmData = await fetchOsmData();
    const wayCount = osmData.elements.filter(e => e.type === 'way').length;
    console.log(`  ${wayCount} ways fetched\n`);

    // Step 2: Stitch
    console.log('Step 2: Stitching master polyline...');
    const rawMasterCoords = stitchWays(osmData);
    const rawCumMiles = buildCumulativeMiles(rawMasterCoords);
    const rawTotalMiles = rawCumMiles[rawCumMiles.length - 1];
    console.log(`  Raw master polyline: ${rawMasterCoords.length} vertices, ${rawTotalMiles.toFixed(2)} miles total`);

    // Step 2b: Trim upstream headwaters — snap Granite to raw polyline, then slice there.
    // This makes Granite = mile 0 by convention.
    console.log('  Finding Granite vertex for upstream trim...');
    let graniteRawIdx = 0;
    let graniteRawDist = Infinity;
    for (let i = 0; i < rawMasterCoords.length; i++) {
        const [lng, lat] = rawMasterCoords[i];
        const d = haversineMiles(GRANITE_LAT, GRANITE_LNG, lat, lng);
        if (d < graniteRawDist) {
            graniteRawDist = d;
            graniteRawIdx = i;
        }
    }
    const graniteOffset = rawCumMiles[graniteRawIdx];
    console.log(`  Granite snapped at raw vertex ${graniteRawIdx} (${graniteRawDist.toFixed(4)} mi off river), raw cumMile=${graniteOffset.toFixed(4)}`);
    console.log(`  graniteOffset (subtracted from all river miles): ${graniteOffset.toFixed(4)} mi`);

    // Slice from Granite vertex onward; recompute cumulative miles (now Granite-anchored)
    const masterCoords = rawMasterCoords.slice(graniteRawIdx);
    const cumMiles = buildCumulativeMiles(masterCoords);
    const totalMiles = cumMiles[cumMiles.length - 1];
    console.log(`  Trimmed master polyline: ${masterCoords.length} vertices, ${totalMiles.toFixed(2)} miles (Granite-anchored)\n`);

    // Write master polyline
    await mkdir(resolve(PROJECT_ROOT, 'app/src/data'), { recursive: true });
    await writeFile(MASTER_PATH, JSON.stringify({ coords: masterCoords, cumMiles }, null, 2), 'utf8');
    console.log(`  Wrote master polyline to ${MASTER_PATH}\n`);

    // Step 3: Snap access points
    console.log('Step 3: Snapping access points...');
    const snapMap = snapAccessPoints(masterCoords, cumMiles);
    console.log(`  Snapped ${snapMap.size} access points\n`);

    // Step 4: Validate ordering
    console.log('Step 4: Validating section ordering...');
    const validSections = validateSectionOrdering(snapMap);
    const invalidCount = ARKANSAS_SECTION_IDS.filter(id => !validSections.has(id)).length;
    console.log(`  ${validSections.size}/${ARKANSAS_SECTION_IDS.length} sections passed ordering check (${invalidCount} invalid)\n`);

    // Step 5: Slice sections
    console.log('Step 5: Slicing per-section polylines...');
    const sectionGeometries = sliceSections(masterCoords, snapMap, validSections);
    console.log('');

    // Step 6a: Update river-geometries.ts
    console.log('Step 6a: Updating river-geometries.ts...');
    await updateRiverGeometries(sectionGeometries, cumMiles, snapMap);
    console.log('');

    // Step 6b: Update curated-river-data.ts riverMile fields
    console.log('Step 6b: Updating riverMile in curated-river-data.ts...');
    await updateCuratedRiverMiles(snapMap);
    console.log('');

    // ── Summary ───────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════');
    console.log(' SUMMARY');
    console.log('═══════════════════════════════════════════\n');

    console.log(`OSM ways fetched:        ${wayCount}`);
    console.log(`Raw master polyline:      ${rawMasterCoords.length} vertices, ${rawTotalMiles.toFixed(2)} miles (headwaters to Pueblo)`);
    console.log(`Granite offset subtracted: ${graniteOffset.toFixed(4)} miles (${graniteRawIdx} vertices trimmed from upstream)`);
    console.log(`Trimmed master polyline:  ${masterCoords.length} vertices, ${totalMiles.toFixed(2)} miles (Granite-anchored)`);
    console.log(`  Start (Granite):  lat=${masterCoords[0][1].toFixed(5)}, lng=${masterCoords[0][0].toFixed(5)}`);
    console.log(`  End (downstream): lat=${masterCoords[masterCoords.length-1][1].toFixed(5)}, lng=${masterCoords[masterCoords.length-1][0].toFixed(5)}`);
    console.log('');

    // Per-AP snap distances sorted biggest first
    const sortedSnaps = [...snapMap.values()].sort((a, b) => b.offRiverDistanceMiles - a.offRiverDistanceMiles);
    console.log('Per-AP snap distances (biggest first):');
    for (const s of sortedSnaps) {
        const flag = s.offRiverDistanceMiles > 2 ? ' ⚠ WARNING: > 2 mi' : (s.offRiverDistanceMiles > 1 ? ' (> 1 mi)' : '');
        console.log(`  ${s.name.padEnd(42)} snapIdx=${String(s.snapIdx).padStart(5)}  riverMile=${String(s.riverMile.toFixed(2)).padStart(7)}  offRiver=${s.offRiverDistanceMiles.toFixed(3)} mi${flag}`);
    }
    console.log('');

    // Per-section vertex count and length
    console.log('Per-section geometry:');
    for (const sectionId of ARKANSAS_SECTION_IDS) {
        if (!validSections.has(sectionId)) {
            console.log(`  ${sectionId.padEnd(36)}  SKIPPED (ordering failed)`);
            continue;
        }
        const geom = sectionGeometries.get(sectionId)!;
        const leg = SECTION_LEG_MAPPING[sectionId]!;
        const fromAP = snapMap.get(leg.fromAccessPointId!)!;
        const toAP = snapMap.get(leg.toAccessPointId!)!;
        const sectionMiles = (toAP.riverMile - fromAP.riverMile).toFixed(2);
        console.log(`  ${sectionId.padEnd(36)}  ${String(geom.length).padStart(5)} verts  ${sectionMiles.padStart(6)} mi`);
    }
    console.log('');

    if (invalidCount > 0) {
        console.log(`WARNINGS: ${invalidCount} sections skipped due to ordering failures. Review errors above.`);
    } else {
        console.log('All sections passed ordering validation.');
    }

    console.log('\nDone.\n');
}

main().catch(err => {
    console.error('\nFATAL:', err);
    process.exit(1);
});
