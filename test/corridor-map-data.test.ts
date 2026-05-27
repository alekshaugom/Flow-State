import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	corridorBoundsFromPolyline,
	pointAtMileGeographic,
	sectionSubPolyline,
} from '../app/src/lib/corridor-map-data.ts';

// Helper: assert two numbers are close.
const closeTo = (actual: number, expected: number, eps: number, msg?: string) =>
	assert.ok(
		Math.abs(actual - expected) < eps,
		`${msg ?? ''} expected ${actual} ≈ ${expected} (eps=${eps})`,
	);

// -- corridorBoundsFromPolyline -----------------------------------------------

test('corridorBoundsFromPolyline throws for empty input', () => {
	assert.throws(() => corridorBoundsFromPolyline([]), /at least one point/);
});

test('corridorBoundsFromPolyline single point returns degenerate bbox', () => {
	const [w, s, e, n] = corridorBoundsFromPolyline([[-106.0, 39.0]]);
	assert.equal(w, -106.0);
	assert.equal(e, -106.0);
	assert.equal(s, 39.0);
	assert.equal(n, 39.0);
});

test('corridorBoundsFromPolyline returns correct bbox for a spread polyline', () => {
	const poly: Array<[number, number, number]> = [
		[-106.5, 38.5, 0],
		[-106.0, 39.0, 5],
		[-105.8, 38.8, 8],
	];
	const [w, s, e, n] = corridorBoundsFromPolyline(poly);
	assert.equal(w, -106.5);
	assert.equal(e, -105.8);
	assert.equal(s, 38.5);
	assert.equal(n, 39.0);
});

test('corridorBoundsFromPolyline handles [lng, lat] 2-tuples', () => {
	const poly: Array<[number, number]> = [[-107.0, 37.0], [-105.0, 41.0]];
	const [w, s, e, n] = corridorBoundsFromPolyline(poly);
	assert.equal(w, -107.0);
	assert.equal(e, -105.0);
	assert.equal(s, 37.0);
	assert.equal(n, 41.0);
});

// -- pointAtMileGeographic ----------------------------------------------------

test('pointAtMileGeographic returns null for empty polyline', () => {
	assert.equal(pointAtMileGeographic([], 5), null);
});

test('pointAtMileGeographic returns null for 2-tuple polyline (no mile index)', () => {
	const poly: Array<[number, number]> = [[-106.0, 39.0], [-105.5, 39.5]];
	assert.equal(pointAtMileGeographic(poly, 0), null);
});

test('pointAtMileGeographic returns null for out-of-range mile (below)', () => {
	const poly: Array<[number, number, number]> = [[-106.0, 39.0, 0], [-105.5, 39.5, 5]];
	assert.equal(pointAtMileGeographic(poly, -1), null);
});

test('pointAtMileGeographic returns null for out-of-range mile (above)', () => {
	const poly: Array<[number, number, number]> = [[-106.0, 39.0, 0], [-105.5, 39.5, 5]];
	assert.equal(pointAtMileGeographic(poly, 6), null);
});

test('pointAtMileGeographic returns exact start point at mile 0', () => {
	const poly: Array<[number, number, number]> = [[-106.0, 39.0, 0], [-105.5, 39.5, 5]];
	const pt = pointAtMileGeographic(poly, 0);
	assert.ok(pt);
	assert.equal(pt!.lng, -106.0);
	assert.equal(pt!.lat, 39.0);
});

test('pointAtMileGeographic returns exact end point at final mile', () => {
	const poly: Array<[number, number, number]> = [[-106.0, 39.0, 0], [-105.5, 39.5, 5]];
	const pt = pointAtMileGeographic(poly, 5);
	assert.ok(pt);
	assert.equal(pt!.lng, -105.5);
	assert.equal(pt!.lat, 39.5);
});

test('pointAtMileGeographic linearly interpolates at midpoint', () => {
	const poly: Array<[number, number, number]> = [[-106.0, 39.0, 0], [-105.0, 40.0, 10]];
	const pt = pointAtMileGeographic(poly, 5);
	assert.ok(pt);
	closeTo(pt!.lng, -105.5, 1e-9, 'midpoint lng');
	closeTo(pt!.lat, 39.5, 1e-9, 'midpoint lat');
});

test('pointAtMileGeographic picks correct segment with multiple vertices', () => {
	const poly: Array<[number, number, number]> = [
		[-106.0, 39.0, 0],
		[-105.5, 39.0, 5],  // vertex at mile 5
		[-105.0, 40.0, 10],
	];
	// At mile 7.5 we should interpolate between the second and third points.
	const pt = pointAtMileGeographic(poly, 7.5);
	assert.ok(pt);
	closeTo(pt!.lng, -105.25, 1e-9, 'lng at mile 7.5');
	closeTo(pt!.lat, 39.5, 1e-9, 'lat at mile 7.5');
});

// -- sectionSubPolyline -------------------------------------------------------

test('sectionSubPolyline returns empty for empty polyline', () => {
	assert.deepEqual(sectionSubPolyline([], 0, 5), []);
});

test('sectionSubPolyline returns empty when startMile >= endMile', () => {
	const poly: Array<[number, number, number]> = [[-106.0, 39.0, 0], [-105.0, 40.0, 10]];
	assert.deepEqual(sectionSubPolyline(poly, 5, 5), []);
	assert.deepEqual(sectionSubPolyline(poly, 6, 4), []);
});

test('sectionSubPolyline covers the full polyline when range matches', () => {
	const poly: Array<[number, number, number]> = [
		[-106.0, 39.0, 0],
		[-105.5, 39.5, 5],
		[-105.0, 40.0, 10],
	];
	const result = sectionSubPolyline(poly, 0, 10);
	// Should have start point, interior vertex, and end point.
	assert.ok(result.length >= 3, `expected >= 3 points, got ${result.length}`);
	// First and last should be the endpoints.
	closeTo(result[0][0], -106.0, 1e-9, 'first lng');
	closeTo(result[result.length - 1][0], -105.0, 1e-9, 'last lng');
});

test('sectionSubPolyline produces only interpolated endpoints for a single-vertex range', () => {
	const poly: Array<[number, number, number]> = [
		[-106.0, 39.0, 0],
		[-105.5, 39.5, 5],
		[-105.0, 40.0, 10],
	];
	// Range 2–4: no interior vertex, just two interpolated endpoints.
	const result = sectionSubPolyline(poly, 2, 4);
	assert.ok(result.length >= 2, 'should have at least start and end points');
	// All points should be between mile 2 and mile 4 geographically (lng between -106 and -105.5).
	for (const [lng] of result) {
		assert.ok(lng <= -105.5 && lng >= -106.0, `lng ${lng} out of expected range`);
	}
});

test('sectionSubPolyline clamps to polyline span', () => {
	const poly: Array<[number, number, number]> = [
		[-106.0, 39.0, 2],   // starts at mile 2
		[-105.0, 40.0, 8],   // ends at mile 8
	];
	// Request range 0–10 (wider than polyline) — should be clamped.
	const result = sectionSubPolyline(poly, 0, 10);
	assert.ok(result.length >= 2);
	closeTo(result[0][0], -106.0, 1e-9, 'start clamped to polyline start');
	closeTo(result[result.length - 1][0], -105.0, 1e-9, 'end clamped to polyline end');
});

test('sectionSubPolyline mid-segment range collects correct interior vertices', () => {
	const poly: Array<[number, number, number]> = [
		[-107.0, 38.0, 0],
		[-106.0, 39.0, 5],
		[-105.0, 40.0, 10],
		[-104.0, 41.0, 15],
	];
	// Range 3–12: should include the vertices at miles 5 and 10.
	const result = sectionSubPolyline(poly, 3, 12);
	// Interior vertices at miles 5 and 10 are strictly inside (3, 12).
	const lngs = result.map(p => p[0]);
	assert.ok(lngs.includes(-106.0), 'mile-5 vertex should be included');
	assert.ok(lngs.includes(-105.0), 'mile-10 vertex should be included');
});
