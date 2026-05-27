import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { pickActiveTile, type TileMeasurement } from '../app/src/lib/active-tile-pure.ts';

// Helper to build a simple TileMeasurement.
function tile(id: string, topY: number, height: number, startMile: number, endMile: number): TileMeasurement {
	return { id, topY, height, startMile, endMile };
}

const closeTo = (actual: number, expected: number, eps: number, msg?: string) =>
	assert.ok(Math.abs(actual - expected) < eps, `${msg ?? ''} expected ${actual} ≈ ${expected} (eps=${eps})`);

test('pickActiveTile: empty tiles returns null/null', () => {
	const result = pickActiveTile([], 500);
	assert.equal(result.activeSectionId, null);
	assert.equal(result.activeMile, null);
});

test('pickActiveTile: single tile, viewport at tile top → activeMile === startMile', () => {
	const tiles = [tile('a', 100, 200, 0, 5)];
	const result = pickActiveTile(tiles, 100);
	assert.equal(result.activeSectionId, 'a');
	assert.equal(result.activeMile, 0);
});

test('pickActiveTile: single tile, viewport at tile bottom → activeMile === endMile', () => {
	const tiles = [tile('a', 100, 200, 0, 5)];
	const result = pickActiveTile(tiles, 300);
	assert.equal(result.activeSectionId, 'a');
	assert.equal(result.activeMile, 5);
});

test('pickActiveTile: single tile, viewport at midpoint → activeMile === (start+end)/2', () => {
	const tiles = [tile('a', 100, 200, 2, 8)];
	const result = pickActiveTile(tiles, 200); // topY + height/2 = 100 + 100 = 200
	assert.equal(result.activeSectionId, 'a');
	closeTo(result.activeMile!, 5, 1e-9, 'midpoint mile');
});

test('pickActiveTile: multiple tiles, viewport inside tile #2 → tile #2 wins', () => {
	const tiles = [
		tile('section-1', 0, 300, 0, 10),
		tile('section-2', 300, 400, 10, 20),
		tile('section-3', 700, 300, 20, 28),
	];
	// Put viewport center at 75% through tile #2: 300 + 300 = 600
	const result = pickActiveTile(tiles, 600);
	assert.equal(result.activeSectionId, 'section-2');
	// ratio = (600 - 300) / 400 = 0.75; mile = 10 + 0.75 * 10 = 17.5
	closeTo(result.activeMile!, 17.5, 1e-9, 'interpolated mile within tile 2');
});

test('pickActiveTile: viewport above first tile → first tile wins, mile clamped to startMile', () => {
	const tiles = [
		tile('first', 200, 300, 0, 8),
		tile('second', 500, 300, 8, 16),
	];
	// viewport center at 50 — above the first tile (topY=200)
	const result = pickActiveTile(tiles, 50);
	assert.equal(result.activeSectionId, 'first');
	// viewport is above midY of first tile (200+150=350), so clamp to startMile
	assert.equal(result.activeMile, 0);
});

test('pickActiveTile: viewport below last tile → last tile wins, mile clamped to endMile', () => {
	const tiles = [
		tile('first', 0, 300, 0, 8),
		tile('last', 300, 300, 8, 18),
	];
	// viewport center at 1000 — below both tiles
	const result = pickActiveTile(tiles, 1000);
	assert.equal(result.activeSectionId, 'last');
	// viewport is below midY of last tile (300+150=450), so clamp to endMile
	assert.equal(result.activeMile, 18);
});

test('pickActiveTile: viewport in gap between two tiles → nearer tile wins by midpoint distance', () => {
	const tiles = [
		tile('upper', 0, 200, 0, 5),    // midY = 100
		tile('lower', 300, 200, 5, 10), // midY = 400
	];
	// Gap is from y=200 to y=300. Viewport center at 220 → closer to upper (midY=100, dist=120)
	// than to lower (midY=400, dist=180).
	const result220 = pickActiveTile(tiles, 220);
	assert.equal(result220.activeSectionId, 'upper');
	// 220 < midY of upper (100)? No, 220 > 100, so clamp to endMile
	assert.equal(result220.activeMile, 5);

	// Viewport center at 280 → closer to lower (midY=400, dist=120) vs upper (midY=100, dist=180).
	const result280 = pickActiveTile(tiles, 280);
	assert.equal(result280.activeSectionId, 'lower');
	// 280 < midY of lower (400), so clamp to startMile
	assert.equal(result280.activeMile, 5);
});
