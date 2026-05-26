import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	haversineMiles,
	cumulativeMiles,
	principalAxis,
	projectToVertical,
	smoothLateral,
	normalizeLateral,
	scaleYByPixelsPerMile,
	catmullRomPath,
	pointAtMile,
	buildSpinePath,
	type LonLat,
} from '../app/src/lib/corridor-spine-pure.ts';

const closeTo = (actual: number, expected: number, eps: number, msg?: string) =>
	assert.ok(Math.abs(actual - expected) < eps, `${msg ?? ''} expected ${actual} ≈ ${expected} (eps=${eps})`);

test('haversineMiles returns 0 for identical points', () => {
	assert.equal(haversineMiles([-106.5, 39.0], [-106.5, 39.0]), 0);
});

test('haversineMiles measures a known small distance (~1 deg latitude ≈ 69 mi)', () => {
	const d = haversineMiles([-106.5, 39.0], [-106.5, 40.0]);
	closeTo(d, 69.05, 0.5, 'one degree of latitude');
});

test('cumulativeMiles returns [] for empty input', () => {
	assert.deepEqual(cumulativeMiles([]), []);
});

test('cumulativeMiles returns [0] for single point', () => {
	assert.deepEqual(cumulativeMiles([[-106, 39]]), [0]);
});

test('cumulativeMiles is monotonic non-decreasing', () => {
	const polyline: LonLat[] = [
		[-106.5, 39.0],
		[-106.4, 39.05],
		[-106.3, 39.1],
		[-106.2, 39.15],
	];
	const cum = cumulativeMiles(polyline);
	assert.equal(cum[0], 0);
	for (let i = 1; i < cum.length; i++) assert.ok(cum[i] >= cum[i - 1], `cum[${i}] should be >= cum[${i - 1}]`);
});

test('principalAxis for a N-S polyline yields axis ≈ (0, ±1)', () => {
	const polyline: LonLat[] = [];
	for (let i = 0; i <= 10; i++) polyline.push([-106.0, 39.0 + i * 0.01]);
	const { axis } = principalAxis(polyline);
	closeTo(Math.abs(axis.x), 0, 0.05, 'axis.x small for N-S');
	closeTo(Math.abs(axis.y), 1, 0.05, '|axis.y| ≈ 1 for N-S');
});

test('principalAxis for an E-W polyline yields axis ≈ (±1, 0)', () => {
	const polyline: LonLat[] = [];
	for (let i = 0; i <= 10; i++) polyline.push([-106.0 + i * 0.01, 39.0]);
	const { axis } = principalAxis(polyline);
	closeTo(Math.abs(axis.x), 1, 0.05, '|axis.x| ≈ 1 for E-W');
	closeTo(Math.abs(axis.y), 0, 0.05, 'axis.y small for E-W');
});

test('principalAxis orients downstream so axis · travel > 0', () => {
	// A polyline running NE: start lower-left, end upper-right.
	const polyline: LonLat[] = [];
	for (let i = 0; i <= 10; i++) polyline.push([-106.0 + i * 0.01, 39.0 + i * 0.01]);
	const { axis } = principalAxis(polyline);
	const first = polyline[0];
	const last = polyline[polyline.length - 1];
	// axis should point in the same general direction as (last - first) projected into our frame
	const travelLon = last[0] - first[0];
	const travelLat = last[1] - first[1];
	// In our projection x is east (lon-aligned with cos(lat) scale), y is north — sign should match travel sign.
	assert.ok(axis.x * travelLon + axis.y * travelLat > 0, 'axis points downstream');
});

test('projectToVertical sets y[i] = cumMile[i] and mile[i] = cumMile[i]', () => {
	const polyline: LonLat[] = [
		[-106.5, 39.0],
		[-106.4, 39.05],
		[-106.3, 39.1],
	];
	const cum = cumulativeMiles(polyline);
	const projected = projectToVertical(polyline, cum);
	assert.equal(projected.length, 3);
	for (let i = 0; i < 3; i++) {
		closeTo(projected[i].y, cum[i], 1e-9, `y[${i}] = cumMile[${i}]`);
		closeTo(projected[i].mile, cum[i], 1e-9, `mile[${i}] = cumMile[${i}]`);
	}
});

test('projectToVertical: a perfectly straight diagonal has near-zero |x|', () => {
	const polyline: LonLat[] = [];
	for (let i = 0; i <= 20; i++) polyline.push([-106.0 + i * 0.005, 39.0 + i * 0.005]);
	const projected = projectToVertical(polyline);
	for (const p of projected) {
		closeTo(p.x, 0, 5, 'straight line has small perpendicular offset (within 5 meters of axis)');
	}
});

test('smoothLateral with window=1 is the identity (values preserved)', () => {
	const pts = [
		{ x: 5, y: 0, mile: 0 },
		{ x: -10, y: 10, mile: 10 },
		{ x: 3, y: 20, mile: 20 },
	];
	const out = smoothLateral(pts, 1);
	assert.equal(out.length, 3);
	for (let i = 0; i < 3; i++) {
		assert.equal(out[i].x, pts[i].x);
		assert.equal(out[i].y, pts[i].y);
		assert.equal(out[i].mile, pts[i].mile);
	}
});

test('smoothLateral dampens an isolated spike', () => {
	const pts = [
		{ x: 0, y: 0, mile: 0 },
		{ x: 0, y: 1, mile: 1 },
		{ x: 0, y: 2, mile: 2 },
		{ x: 100, y: 3, mile: 3 }, // spike
		{ x: 0, y: 4, mile: 4 },
		{ x: 0, y: 5, mile: 5 },
		{ x: 0, y: 6, mile: 6 },
	];
	const out = smoothLateral(pts, 5);
	assert.ok(Math.abs(out[3].x) < 50, `spike at i=3 (x=100) should be dampened to < 50, got ${out[3].x}`);
});

test('smoothLateral preserves y and mile fields', () => {
	const pts = [
		{ x: 0, y: 0, mile: 0 },
		{ x: 10, y: 5, mile: 5 },
		{ x: 0, y: 10, mile: 10 },
	];
	const out = smoothLateral(pts, 3);
	for (let i = 0; i < pts.length; i++) {
		assert.equal(out[i].y, pts[i].y);
		assert.equal(out[i].mile, pts[i].mile);
	}
});

test('normalizeLateral scales so 95th-percentile |x| ≈ laneHalfWidth', () => {
	const pts: { x: number; y: number; mile: number }[] = [];
	for (let i = 0; i < 100; i++) {
		pts.push({ x: i - 50, y: i, mile: i }); // x ranges from -50 to +49, p95 |x| ≈ 47
	}
	const lane = 100;
	const out = normalizeLateral(pts, lane);
	const absX = out.map(p => Math.abs(p.x)).sort((a, b) => a - b);
	const p95 = absX[Math.floor(absX.length * 0.95)];
	// After scaling so input p95 → lane, the output p95 should be near lane (allowing for index-vs-interpolation drift).
	closeTo(p95, lane, lane * 0.1, '95th percentile of |x| after normalize ≈ lane width');
});

test('normalizeLateral clamps tails to ±laneHalfWidth', () => {
	const pts = [
		{ x: -100, y: 0, mile: 0 },
		{ x: 0, y: 5, mile: 5 },
		{ x: 200, y: 10, mile: 10 }, // would scale way past lane
	];
	const lane = 50;
	const out = normalizeLateral(pts, lane, /*ampMeters*/ 10);
	for (const p of out) {
		assert.ok(p.x >= -lane - 1e-9 && p.x <= lane + 1e-9, `x=${p.x} should be clamped to [-${lane}, ${lane}]`);
	}
});

test('scaleYByPixelsPerMile multiplies y by ppm and preserves mile', () => {
	const pts = [
		{ x: 0, y: 0, mile: 0 },
		{ x: 0, y: 5, mile: 5 },
		{ x: 0, y: 10, mile: 10 },
	];
	const out = scaleYByPixelsPerMile(pts, 80);
	assert.equal(out[0].y, 0);
	assert.equal(out[1].y, 400);
	assert.equal(out[2].y, 800);
	assert.equal(out[2].mile, 10, 'mile is unchanged');
});

test('catmullRomPath returns empty string for empty input', () => {
	assert.equal(catmullRomPath([]), '');
});

test('catmullRomPath single point produces only a Move command', () => {
	const d = catmullRomPath([{ x: 10, y: 20 }]);
	assert.equal(d, 'M 10 20');
});

test('catmullRomPath multi-point produces M + C commands', () => {
	const d = catmullRomPath([
		{ x: 0, y: 0 },
		{ x: 10, y: 10 },
		{ x: 20, y: 0 },
		{ x: 30, y: 10 },
	]);
	assert.match(d, /^M /, 'starts with M');
	const cMatches = d.match(/C /g) ?? [];
	assert.equal(cMatches.length, 3, '3 segments → 3 C commands');
});

test('pointAtMile returns null for out-of-range query', () => {
	const pts = [
		{ x: 0, y: 0, mile: 0 },
		{ x: 5, y: 100, mile: 10 },
	];
	assert.equal(pointAtMile(pts, -1), null);
	assert.equal(pointAtMile(pts, 11), null);
});

test('pointAtMile returns vertex at exact match', () => {
	const pts = [
		{ x: 0, y: 0, mile: 0 },
		{ x: 5, y: 100, mile: 10 },
		{ x: 0, y: 200, mile: 20 },
	];
	assert.deepEqual(pointAtMile(pts, 0), { x: 0, y: 0 });
	assert.deepEqual(pointAtMile(pts, 10), { x: 5, y: 100 });
	assert.deepEqual(pointAtMile(pts, 20), { x: 0, y: 200 });
});

test('pointAtMile linearly interpolates between vertices', () => {
	const pts = [
		{ x: 0, y: 0, mile: 0 },
		{ x: 10, y: 100, mile: 10 },
	];
	const mid = pointAtMile(pts, 5);
	assert.ok(mid);
	closeTo(mid!.x, 5, 1e-9, 'midpoint x');
	closeTo(mid!.y, 50, 1e-9, 'midpoint y');
});

test('buildSpinePath end-to-end on a synthetic Arkansas-like polyline', () => {
	// Synthetic ~5-mile polyline running W→E with a wiggle.
	const polyline: LonLat[] = [];
	for (let i = 0; i <= 50; i++) {
		const lon = -106.0 + (i / 50) * 0.07;
		const lat = 38.9 + Math.sin(i * 0.4) * 0.005;
		polyline.push([lon, lat]);
	}
	const result = buildSpinePath(polyline, { pixelsPerMile: 80, laneHalfWidthPx: 64 });
	assert.ok(result.totalMiles > 3 && result.totalMiles < 10, `totalMiles should be ~5 (got ${result.totalMiles})`);
	assert.equal(result.totalHeightPx, result.totalMiles * 80);
	assert.equal(result.points.length, polyline.length);
	assert.match(result.path, /^M /, 'path starts with M');
	// All x values within lane after normalization
	for (const p of result.points) {
		assert.ok(Math.abs(p.x) <= 64 + 1e-6, `|x|=${Math.abs(p.x)} should be within laneHalfWidthPx (64)`);
	}
	// y should be monotonically non-decreasing
	for (let i = 1; i < result.points.length; i++) {
		assert.ok(result.points[i].y >= result.points[i - 1].y, `y[${i}] should be >= y[${i - 1}]`);
	}
});
