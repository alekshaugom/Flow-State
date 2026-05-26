// Pure geometry math for transforming NHDPlus-derived river polylines into
// vertically-scrollable SVG paths. Self-contained: no DOM, no React, no Harper.
// Importable from server resources (CorridorView) and client components alike.
//
// The core idea — Y axis is true river-mile (monotonic, downstream-positive),
// X axis is the perpendicular deviation from the corridor's principal axis,
// smoothed and amplitude-normalized so it fits inside a fixed lane width
// regardless of how meandering the river is.

export type LonLat = [number, number];

export interface SpinePoint {
	x: number;     // lateral deviation in projected meters (pre-normalize) or px (post-normalize)
	y: number;     // river-mile (pre-scale) or px (post-scale)
	mile: number;  // canonical cumulative river-mile from the corridor head
}

const EARTH_MILES = 3958.8;
const EARTH_METERS = 6371000;

function toRad(deg: number): number {
	return deg * Math.PI / 180;
}

// Haversine on [lon, lat] pairs, miles.
export function haversineMiles(a: LonLat, b: LonLat): number {
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const φ1 = toRad(lat1);
	const φ2 = toRad(lat2);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

// For each vertex i, the cumulative miles from polyline[0] to polyline[i].
// cumMiles[0] = 0; final value = total downstream length.
export function cumulativeMiles(polyline: LonLat[]): number[] {
	if (polyline.length === 0) return [];
	const out = new Array<number>(polyline.length);
	out[0] = 0;
	for (let i = 1; i < polyline.length; i++) {
		out[i] = out[i - 1] + haversineMiles(polyline[i - 1], polyline[i]);
	}
	return out;
}

// Approximate equirectangular projection of [lon, lat] → meters relative to
// centroid (lon0, lat0). Accurate enough for sub-100-mile corridors where the
// principal-axis math only cares about relative geometry.
function projectMeters(lonlat: LonLat, lon0: number, lat0Rad: number): { x: number; y: number } {
	const x = EARTH_METERS * toRad(lonlat[0] - lon0) * Math.cos(lat0Rad);
	const y = EARTH_METERS * toRad(lonlat[1] - (lat0Rad * 180 / Math.PI));
	return { x, y };
}

// Principal axis (in meters-projected space) and a perpendicular vector,
// oriented so the perpendicular points to the *left* of downstream travel.
// Returns the axis unit vector + perpendicular unit vector, plus the centroid.
export function principalAxis(polyline: LonLat[]): {
	lon0: number;
	lat0: number;
	axis: { x: number; y: number };
	perp: { x: number; y: number };
} {
	if (polyline.length < 2) {
		return { lon0: polyline[0]?.[0] ?? 0, lat0: polyline[0]?.[1] ?? 0, axis: { x: 1, y: 0 }, perp: { x: 0, y: 1 } };
	}
	let lonSum = 0;
	let latSum = 0;
	for (const p of polyline) { lonSum += p[0]; latSum += p[1]; }
	const lon0 = lonSum / polyline.length;
	const lat0 = latSum / polyline.length;
	const lat0Rad = toRad(lat0);

	let sxx = 0;
	let syy = 0;
	let sxy = 0;
	const projected: Array<{ x: number; y: number }> = [];
	for (const p of polyline) {
		const m = projectMeters(p, lon0, lat0Rad);
		projected.push(m);
		sxx += m.x * m.x;
		syy += m.y * m.y;
		sxy += m.x * m.y;
	}
	const n = polyline.length;
	const a = sxx / n;
	const c = syy / n;
	const b = sxy / n;

	// Eigenvalues of [[a, b], [b, c]]:
	const halfTrace = (a + c) / 2;
	const disc = Math.sqrt(((a - c) / 2) ** 2 + b * b);
	const lambdaMax = halfTrace + disc;

	// Eigenvector for lambdaMax. If b ≈ 0, axis is aligned with whichever variance is larger.
	let vx: number;
	let vy: number;
	if (Math.abs(b) > 1e-9) {
		vx = b;
		vy = lambdaMax - a;
	} else if (a >= c) {
		vx = 1; vy = 0;
	} else {
		vx = 0; vy = 1;
	}
	const vLen = Math.hypot(vx, vy) || 1;
	vx /= vLen;
	vy /= vLen;

	// Orient axis so the dot product with (last - first) is positive (= downstream).
	const first = projected[0];
	const last = projected[projected.length - 1];
	const travelX = last.x - first.x;
	const travelY = last.y - first.y;
	if ((vx * travelX + vy * travelY) < 0) {
		vx = -vx;
		vy = -vy;
	}

	// Perpendicular (rotate axis +90 in projected/meters frame).
	const perpX = -vy;
	const perpY = vx;
	return {
		lon0,
		lat0,
		axis: { x: vx, y: vy },
		perp: { x: perpX, y: perpY },
	};
}

// Project a NHDPlus polyline (downstream-ordered) into spine coordinates:
// y = cumulative river-mile (monotonic), x = signed perpendicular distance from
// the principal axis in projected meters.
export function projectToVertical(polyline: LonLat[], cumMiles?: number[]): SpinePoint[] {
	if (polyline.length === 0) return [];
	const miles = cumMiles ?? cumulativeMiles(polyline);
	if (polyline.length === 1) {
		return [{ x: 0, y: miles[0], mile: miles[0] }];
	}
	const { lon0, lat0, perp } = principalAxis(polyline);
	const lat0Rad = toRad(lat0);
	const out: SpinePoint[] = new Array(polyline.length);
	for (let i = 0; i < polyline.length; i++) {
		const m = projectMeters(polyline[i], lon0, lat0Rad);
		const t = m.x * perp.x + m.y * perp.y; // signed perpendicular distance
		out[i] = { x: t, y: miles[i], mile: miles[i] };
	}
	return out;
}

// Centered moving-average smoothing on `x`. Window must be odd; window=1 is a no-op.
// Edges use shorter windows so the smoothed series stays the same length.
export function smoothLateral<T extends { x: number; y: number; mile: number }>(
	points: T[],
	window: number = 5,
): T[] {
	if (points.length === 0 || window <= 1) return points.map(p => ({ ...p }));
	const w = window % 2 === 0 ? window + 1 : window; // force odd
	const half = (w - 1) / 2;
	const out: T[] = new Array(points.length);
	for (let i = 0; i < points.length; i++) {
		const lo = Math.max(0, i - half);
		const hi = Math.min(points.length - 1, i + half);
		let sum = 0;
		for (let j = lo; j <= hi; j++) sum += points[j].x;
		out[i] = { ...points[i], x: sum / (hi - lo + 1) };
	}
	return out;
}

function percentile(sortedAsc: number[], p: number): number {
	if (sortedAsc.length === 0) return 0;
	if (sortedAsc.length === 1) return sortedAsc[0];
	const idx = (sortedAsc.length - 1) * Math.max(0, Math.min(1, p));
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	const frac = idx - lo;
	return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

// Scale x so the 95th-percentile of |x| equals laneHalfWidthPx; clamp tails to ±laneHalfWidthPx.
// If `ampMeters` is provided, use it as the divisor (instead of the 95th-percentile from data).
// y is unchanged here; scale y separately with pixelsPerMile.
export function normalizeLateral<T extends { x: number; y: number; mile: number }>(
	points: T[],
	laneHalfWidthPx: number,
	ampMeters?: number,
): T[] {
	if (points.length === 0) return [];
	const amp = ampMeters ?? (() => {
		const absX = points.map(p => Math.abs(p.x)).sort((a, b) => a - b);
		const p95 = percentile(absX, 0.95);
		return p95 > 0 ? p95 : 1;
	})();
	const scale = laneHalfWidthPx / amp;
	return points.map(p => ({
		...p,
		x: Math.max(-laneHalfWidthPx, Math.min(laneHalfWidthPx, p.x * scale)),
	}));
}

// Multiply y by pixelsPerMile. Use after projectToVertical → smoothLateral → normalizeLateral.
export function scaleYByPixelsPerMile<T extends { x: number; y: number; mile: number }>(
	points: T[],
	pixelsPerMile: number,
): T[] {
	return points.map(p => ({ ...p, y: p.mile * pixelsPerMile }));
}

// Catmull-Rom spline (tension 0.5) emitted as cubic Bezier segments for an SVG `d` attribute.
// Endpoints repeat to behave as a clamped spline (no overshoot at the ends).
export function catmullRomPath(points: Array<{ x: number; y: number }>): string {
	const n = points.length;
	if (n === 0) return '';
	if (n === 1) return `M ${points[0].x} ${points[0].y}`;
	const get = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
	let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
	for (let i = 0; i < n - 1; i++) {
		const p0 = get(i - 1);
		const p1 = get(i);
		const p2 = get(i + 1);
		const p3 = get(i + 2);
		const c1x = p1.x + (p2.x - p0.x) / 6;
		const c1y = p1.y + (p2.y - p0.y) / 6;
		const c2x = p2.x - (p3.x - p1.x) / 6;
		const c2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
	}
	return d;
}

// Binary search points by `.mile` and linearly interpolate to find (x, y) at the requested mile.
// Returns null if mile is outside the span.
export function pointAtMile<T extends { x: number; y: number; mile: number }>(
	points: T[],
	mile: number,
): { x: number; y: number } | null {
	if (points.length === 0) return null;
	const first = points[0];
	const last = points[points.length - 1];
	if (mile < first.mile || mile > last.mile) return null;
	if (mile === first.mile) return { x: first.x, y: first.y };
	if (mile === last.mile) return { x: last.x, y: last.y };

	let lo = 0;
	let hi = points.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (points[mid].mile <= mile) lo = mid;
		else hi = mid;
	}
	const a = points[lo];
	const b = points[hi];
	const span = b.mile - a.mile;
	if (span <= 0) return { x: a.x, y: a.y };
	const t = (mile - a.mile) / span;
	return {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
	};
}

// One-shot pipeline: NHDPlus polyline → scroll-ready SVG points + path string.
// Returns the scaled points (in px) and the Catmull-Rom path.
export function buildSpinePath(
	polyline: LonLat[],
	opts: {
		pixelsPerMile?: number;
		laneHalfWidthPx?: number;
		smoothingWindow?: number;
		ampMeters?: number;
	} = {},
): { points: SpinePoint[]; path: string; totalMiles: number; totalHeightPx: number } {
	const pixelsPerMile = opts.pixelsPerMile ?? 80;
	const laneHalfWidthPx = opts.laneHalfWidthPx ?? 64;
	const smoothingWindow = opts.smoothingWindow ?? 5;

	if (polyline.length === 0) {
		return { points: [], path: '', totalMiles: 0, totalHeightPx: 0 };
	}

	const miles = cumulativeMiles(polyline);
	const totalMiles = miles[miles.length - 1] ?? 0;

	const projected = projectToVertical(polyline, miles);
	const smoothed = smoothLateral(projected, smoothingWindow);
	const normalized = normalizeLateral(smoothed, laneHalfWidthPx, opts.ampMeters);
	const scaled = scaleYByPixelsPerMile(normalized, pixelsPerMile);
	const path = catmullRomPath(scaled);
	return {
		points: scaled,
		path,
		totalMiles,
		totalHeightPx: totalMiles * pixelsPerMile,
	};
}
