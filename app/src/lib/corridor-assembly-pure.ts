// Assemble a continuous corridor-level polyline from per-section NHDPlus polylines,
// bridging gap sections (where a top-level section has no NHDPlus geometry yet) with
// a straight line between the neighboring polylines' end-points.
//
// Pure: no DOM, no React, no Harper. Importable from server resources too if we
// later choose to do assembly server-side.

import { cumulativeMiles, haversineMiles, type LonLat } from './corridor-spine-pure.ts';

export interface SectionForAssembly {
	id: string;
	sortIndex: number;
	parentSectionId: string | null | undefined;
	lengthMiles?: number | null;
}

export interface SectionRange {
	sectionId: string;
	startMile: number;
	endMile: number;
	hasGeometry: boolean;
}

export interface AssembledCorridor {
	polyline: LonLat[];
	cumulativeMiles: number[];
	totalMiles: number;
	sectionRanges: SectionRange[];
}

const GAP_BRIDGE_THRESHOLD_MILES = 0.05; // any section with < 0.05 mi between cursor and next anchor is treated as continuous

// Top-level sections only (parentSectionId == null), sorted by sortIndex ascending.
// Children (parentSectionId set) inherit their parent's geometry and are mile-ranged inside the parent.
export function selectTopLevelSections(sections: SectionForAssembly[]): SectionForAssembly[] {
	return [...sections]
		.filter(s => !s.parentSectionId)
		.sort((a, b) => a.sortIndex - b.sortIndex);
}

export function assembleCorridorPolyline(
	sections: SectionForAssembly[],
	geometries: Record<string, LonLat[]>,
): AssembledCorridor {
	const topLevel = selectTopLevelSections(sections);
	const polyline: LonLat[] = [];
	const sectionRanges: SectionRange[] = [];
	let cursorMile = 0;

	// First pass — collect anchor pairs per section.
	// For sections with geometry: anchors are first + last vertex of the polyline.
	// For sections without: anchors are null until we can resolve via look-ahead.
	type Anchor = { first: LonLat; last: LonLat; geo: LonLat[] | null };
	const anchors: Anchor[] = topLevel.map(s => {
		const geo = geometries[s.id];
		if (geo && geo.length >= 2) return { first: geo[0], last: geo[geo.length - 1], geo };
		return { first: null as unknown as LonLat, last: null as unknown as LonLat, geo: null };
	});

	// Backfill nulls: for a gap section i, set first = anchors[prev with geo].last, last = anchors[next with geo].first.
	for (let i = 0; i < anchors.length; i++) {
		if (anchors[i].geo) continue;
		// Look backward for previous section with geo
		let prev: LonLat | null = null;
		for (let j = i - 1; j >= 0; j--) {
			if (anchors[j].geo) { prev = anchors[j].last; break; }
		}
		// Look forward for next section with geo
		let next: LonLat | null = null;
		for (let j = i + 1; j < anchors.length; j++) {
			if (anchors[j].geo) { next = anchors[j].first; break; }
		}
		// If we have neither, this gap section is unreachable — leave nulls (will be skipped)
		if (!prev && !next) continue;
		anchors[i].first = prev ?? next!;
		anchors[i].last = next ?? prev!;
	}

	// Second pass — emit the polyline and section ranges.
	for (let i = 0; i < topLevel.length; i++) {
		const section = topLevel[i];
		const a = anchors[i];
		const startMile = cursorMile;

		if (a.geo) {
			if (polyline.length === 0) {
				polyline.push(...a.geo);
			} else {
				// Bridge gap from previous cursor to this geometry's first vertex if non-trivial.
				const prevPoint = polyline[polyline.length - 1];
				const gap = haversineMiles(prevPoint, a.geo[0]);
				if (gap > GAP_BRIDGE_THRESHOLD_MILES) {
					polyline.push(a.geo[0]);
				}
				// Skip the first vertex if we just bridged or if it's essentially the cursor.
				const startIdx = gap > GAP_BRIDGE_THRESHOLD_MILES ? 1 : (gap < 0.0005 ? 1 : 0);
				for (let k = startIdx; k < a.geo.length; k++) polyline.push(a.geo[k]);
			}
		} else if (a.first && a.last) {
			// Degenerate gap (no next-section anchor was found, so look-ahead set last = first).
			// Fall through to the lengthMiles-fallback branch by simulating the "no anchors" path.
			const degenerate = a.first === a.last || haversineMiles(a.first, a.last) < 0.0001;
			if (degenerate) {
				const fallbackLen = Math.max(0, section.lengthMiles ?? 0);
				sectionRanges.push({
					sectionId: section.id,
					startMile,
					endMile: startMile + fallbackLen,
					hasGeometry: false,
				});
				cursorMile = startMile + fallbackLen;
				continue;
			}
			// Gap section — emit a single straight segment from `first` → `last`.
			if (polyline.length === 0) polyline.push(a.first);
			else if (haversineMiles(polyline[polyline.length - 1], a.first) > GAP_BRIDGE_THRESHOLD_MILES) {
				polyline.push(a.first);
			}
			polyline.push(a.last);
		} else {
			// No anchors at all — record the section range with the cursor and move on.
			const fallbackLen = Math.max(0, section.lengthMiles ?? 0);
			sectionRanges.push({
				sectionId: section.id,
				startMile,
				endMile: startMile + fallbackLen,
				hasGeometry: false,
			});
			cursorMile = startMile + fallbackLen;
			continue;
		}

		const newCum = cumulativeMiles(polyline);
		const endMile = newCum[newCum.length - 1];
		sectionRanges.push({
			sectionId: section.id,
			startMile,
			endMile,
			hasGeometry: !!a.geo,
		});
		cursorMile = endMile;
	}

	const cum = cumulativeMiles(polyline);
	return {
		polyline,
		cumulativeMiles: cum,
		totalMiles: cum[cum.length - 1] ?? 0,
		sectionRanges,
	};
}

// Given a parent section and an assembled corridor, project a child section's
// `lengthMiles` (relative to parent.startMile) into a mile range on the corridor.
// Used for hierarchical sub-sections (Pine Creek inside Numbers; Browns Upper/Lower).
export function placeChildInParent(
	parentRange: SectionRange,
	childOffsetMilesFromParentStart: number,
	childLengthMiles: number,
): { startMile: number; endMile: number } {
	const start = parentRange.startMile + Math.max(0, childOffsetMilesFromParentStart);
	const end = Math.min(parentRange.endMile, start + Math.max(0, childLengthMiles));
	return { startMile: start, endMile: end };
}
