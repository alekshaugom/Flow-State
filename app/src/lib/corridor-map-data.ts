// Pure helpers for corridor map data.
// No DOM, no React, no Harper.

/**
 * Build a "tube" polygon that hugs the polyline ±lateralPaddingMiles laterally.
 * Walk the LEFT side forward, then the RIGHT side backward, close the ring.
 * Each perpendicular offset uses flat-earth approximation:
 *   Δlat  ≈ miles × (1/69.0)
 *   Δlng  ≈ miles × (1/69.0) / cos(lat_rad)
 */
export function buildCorridorTubePolygon(
	polyline: [number, number, number][],
	lateralPaddingMiles = 6,
): GeoJSON.Polygon {
	if (polyline.length < 2) {
		// Degenerate — return a tiny point-polygon.
		const [lng, lat] = polyline[0] ?? [0, 0];
		return {
			type: 'Polygon',
			coordinates: [[[lng, lat], [lng, lat], [lng, lat], [lng, lat]]],
		};
	}

	const DEG_PER_MILE_LAT = 1 / 69.0;

	// Compute a unit perpendicular vector (dx, dy) rotated 90° left of the segment direction.
	function perpOffset(
		ax: number, ay: number,
		bx: number, by: number,
		miles: number,
	): [number, number] {
		const cosLat = Math.cos((ay + by) * 0.5 * (Math.PI / 180));
		const dxRaw = bx - ax;
		const dyRaw = by - ay;
		// Normalize in geographic space (account for cos(lat) on longitude).
		const dxGeo = dxRaw * cosLat;
		const dyGeo = dyRaw;
		const len = Math.sqrt(dxGeo * dxGeo + dyGeo * dyGeo);
		if (len === 0) return [0, 0];
		// Perpendicular: rotate 90° left = (-dyGeo, dxGeo).
		const pxNorm = -dyGeo / len;
		const pyNorm = dxGeo / len;
		// Convert back to lng/lat degrees.
		const dlng = (pxNorm * miles * DEG_PER_MILE_LAT) / cosLat;
		const dlat = pyNorm * miles * DEG_PER_MILE_LAT;
		return [dlng, dlat];
	}

	const left: [number, number][] = [];
	const right: [number, number][] = [];
	const n = polyline.length;

	for (let i = 0; i < n; i++) {
		const [lng, lat] = polyline[i];
		// Use the segment before or after (or average for interior points).
		let dx = 0, dy = 0;
		if (i === 0) {
			dx = polyline[1][0] - polyline[0][0];
			dy = polyline[1][1] - polyline[0][1];
		} else if (i === n - 1) {
			dx = polyline[n - 1][0] - polyline[n - 2][0];
			dy = polyline[n - 1][1] - polyline[n - 2][1];
		} else {
			dx = polyline[i + 1][0] - polyline[i - 1][0];
			dy = polyline[i + 1][1] - polyline[i - 1][1];
		}
		// Compute the perpendicular offset using a synthetic neighbour.
		const [dlng, dlat] = perpOffset(lng, lat, lng + dx, lat + dy, lateralPaddingMiles);
		left.push([lng + dlng, lat + dlat]);
		right.push([lng - dlng, lat - dlat]);
	}

	// Ring: left side forward, right side backward, close.
	const ring: [number, number][] = [
		...left,
		...[...right].reverse(),
	];
	ring.push(ring[0]); // close the ring

	return { type: 'Polygon', coordinates: [ring] };
}

// Polyline entries can be [lng, lat] or [lng, lat, mile].
export function corridorBoundsFromPolyline(
	polyline: Array<[number, number] | [number, number, number]>,
): [number, number, number, number] {
	if (polyline.length === 0) {
		throw new Error('corridorBoundsFromPolyline: polyline must have at least one point');
	}

	let west = Infinity;
	let east = -Infinity;
	let south = Infinity;
	let north = -Infinity;

	for (const point of polyline) {
		const lng = point[0];
		const lat = point[1];
		if (lng < west) west = lng;
		if (lng > east) east = lng;
		if (lat < south) south = lat;
		if (lat > north) north = lat;
	}

	return [west, south, east, north];
}

// Given a polyline with cumulative mile at index 2, find the geographic [lng, lat]
// at the requested mile via binary search + linear interpolation.
// Returns null if mile is outside the polyline's span or the polyline is empty.
export function pointAtMileGeographic(
	polyline: Array<[number, number] | [number, number, number]>,
	mile: number,
): { lng: number; lat: number } | null {
	if (polyline.length === 0) return null;

	// Find the first point that has index 2 (cumulative mile).
	// If none have it, we can't do mile-based interpolation.
	const first = polyline[0];
	const last = polyline[polyline.length - 1];
	if (first.length < 3 || last.length < 3) return null;

	const firstMile = first[2] as number;
	const lastMile = last[2] as number;

	if (mile < firstMile || mile > lastMile) return null;
	if (mile === firstMile) return { lng: first[0], lat: first[1] };
	if (mile === lastMile) return { lng: last[0], lat: last[1] };

	// Binary search for the segment containing `mile`.
	let lo = 0;
	let hi = polyline.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		const midMile = (polyline[mid] as [number, number, number])[2];
		if (midMile <= mile) lo = mid;
		else hi = mid;
	}

	const a = polyline[lo] as [number, number, number];
	const b = polyline[hi] as [number, number, number];
	const span = b[2] - a[2];
	if (span <= 0) return { lng: a[0], lat: a[1] };
	const t = (mile - a[2]) / span;
	return {
		lng: a[0] + (b[0] - a[0]) * t,
		lat: a[1] + (b[1] - a[1]) * t,
	};
}

// Extract a geographic sub-polyline from `startMile` to `endMile`.
// Interpolates endpoints; collects all vertices strictly inside the range.
// Returns [] if the mile range falls entirely outside the polyline.
export function sectionSubPolyline(
	polyline: Array<[number, number, number]>,
	startMile: number,
	endMile: number,
): Array<[number, number]> {
	if (polyline.length === 0) return [];
	if (startMile >= endMile) return [];

	const firstMile = polyline[0][2];
	const lastMile = polyline[polyline.length - 1][2];

	// Clamp to the polyline's actual span.
	const clampedStart = Math.max(startMile, firstMile);
	const clampedEnd = Math.min(endMile, lastMile);
	if (clampedStart >= clampedEnd) return [];

	const result: Array<[number, number]> = [];

	// Interpolated start point.
	const startPt = pointAtMileGeographic(polyline, clampedStart);
	if (startPt) result.push([startPt.lng, startPt.lat]);

	// All vertices strictly inside (clampedStart, clampedEnd).
	for (const pt of polyline) {
		const m = pt[2];
		if (m > clampedStart && m < clampedEnd) {
			result.push([pt[0], pt[1]]);
		}
	}

	// Interpolated end point (only if distinct from start).
	if (clampedEnd > clampedStart) {
		const endPt = pointAtMileGeographic(polyline, clampedEnd);
		if (endPt) result.push([endPt.lng, endPt.lat]);
	}

	return result;
}
