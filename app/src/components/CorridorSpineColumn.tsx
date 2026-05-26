import { useEffect, useMemo } from 'react';
import { useActiveMile } from '../hooks/useActiveMile';
import { RIVER_GEOMETRIES } from '../lib/river-geometries.ts';
import { assembleCorridorPolyline, type SectionForAssembly } from '../lib/corridor-assembly-pure.ts';
import { buildSpinePath } from '../lib/corridor-spine-pure.ts';
import { CorridorSpine, type SpineSection, type SpineAccessPoint, type SpineGauge, type SpineDam } from './CorridorSpine';

interface CorridorSpineColumnProps {
	corridorId: string;
	sections: any[];   // from /CorridorView response
	accessPoints: any[];
	gauges: any[];
	dams: any[];
	pixelsPerMile?: number;
	laneHalfWidthPx?: number;
	onActiveSectionChange?: (sectionId: string | null, mile: number | null) => void;
}

const DEFAULT_PPM = 80;
const DEFAULT_LANE = 64;

export function CorridorSpineColumn({
	sections,
	accessPoints,
	gauges,
	dams,
	pixelsPerMile = DEFAULT_PPM,
	laneHalfWidthPx = DEFAULT_LANE,
	onActiveSectionChange,
}: CorridorSpineColumnProps) {
	// Step 1: assemble the corridor-level polyline + section mile ranges.
	const assembly = useMemo(() => {
		const sectionShapes: SectionForAssembly[] = sections.map(s => ({
			id: s.id,
			sortIndex: s.sortIndex ?? 0,
			parentSectionId: s.parentSectionId ?? null,
			lengthMiles: s.lengthMiles ?? null,
		}));
		return assembleCorridorPolyline(sectionShapes, RIVER_GEOMETRIES);
	}, [sections]);

	// Step 2: project the assembled polyline into spine SVG coordinates.
	const spine = useMemo(() => {
		return buildSpinePath(assembly.polyline, { pixelsPerMile, laneHalfWidthPx });
	}, [assembly.polyline, pixelsPerMile, laneHalfWidthPx]);

	// Step 3: place child sections inside their parent's mile range.
	// For now, distribute children evenly across the parent's range — refine when AP coords improve.
	const childAdjustedRanges = useMemo(() => {
		const parentRangeById = new Map<string, { startMile: number; endMile: number }>();
		for (const r of assembly.sectionRanges) parentRangeById.set(r.sectionId, { startMile: r.startMile, endMile: r.endMile });
		const childrenByParent = new Map<string, any[]>();
		for (const s of sections) {
			if (s.parentSectionId) {
				const arr = childrenByParent.get(s.parentSectionId) || [];
				arr.push(s);
				childrenByParent.set(s.parentSectionId, arr);
			}
		}
		const out = [...assembly.sectionRanges];
		for (const [parentId, kids] of childrenByParent) {
			const parentRange = parentRangeById.get(parentId);
			if (!parentRange) continue;
			const sortedKids = [...kids].sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
			const span = parentRange.endMile - parentRange.startMile;
			const totalKidLength = sortedKids.reduce((acc, k) => acc + (k.lengthMiles ?? 0), 0);
			// Use each kid's own lengthMiles when they fit inside the parent;
			// scale down proportionally if their sum overflows.
			const scaleFactor = totalKidLength > 0 && totalKidLength > span ? span / totalKidLength : 1;
			let cursor = parentRange.startMile;
			for (const kid of sortedKids) {
				const len = (kid.lengthMiles ?? span / sortedKids.length) * scaleFactor;
				const kidStart = cursor;
				const kidEnd = Math.min(parentRange.endMile, cursor + len);
				out.push({ sectionId: kid.id, startMile: kidStart, endMile: kidEnd, hasGeometry: true });
				cursor = kidEnd;
			}
		}
		return out;
	}, [assembly.sectionRanges, sections]);

	// Step 4: scroll tracking.
	const { ref, activeMile, scrollToMile } = useActiveMile({
		totalMiles: assembly.totalMiles,
		pixelsPerMile,
	});

	// Step 5: derive the active section from activeMile. Prefer child over parent when both contain the mile.
	const activeSectionId = useMemo(() => {
		if (activeMile === null) return null;
		let best: { id: string; isChild: boolean } | null = null;
		for (const r of childAdjustedRanges) {
			if (activeMile >= r.startMile && activeMile <= r.endMile) {
				const sec = sections.find(s => s.id === r.sectionId);
				if (!sec) continue;
				const isChild = !!sec.parentSectionId;
				if (!best || (isChild && !best.isChild)) {
					best = { id: r.sectionId, isChild };
				}
			}
		}
		return best?.id ?? null;
	}, [activeMile, childAdjustedRanges, sections]);

	// Notify parent of active-section changes (for the right pane).
	useEffect(() => {
		onActiveSectionChange?.(activeSectionId, activeMile);
	}, [activeSectionId, activeMile, onActiveSectionChange]);

	// Map sections + APs + gauges + dams into spine shapes.
	const spineSections: SpineSection[] = useMemo(
		() => sections.map(s => ({
			id: s.id,
			name: s.name,
			parentSectionId: s.parentSectionId ?? null,
			status: s.status ?? 'unknown',
			corridorMileSpan: s.corridorMileSpan ?? { startMile: null, endMile: null },
		})),
		[sections],
	);
	const spineAps: SpineAccessPoint[] = useMemo(
		() => accessPoints.map(ap => ({
			id: ap.id,
			name: ap.name,
			kind: ap.kind,
			riverMile: ap.riverMile,
		})),
		[accessPoints],
	);
	const spineGauges: SpineGauge[] = useMemo(
		() => gauges.map(g => ({
			id: g.id,
			name: g.name,
			currentFlow: g.currentFlow,
			unit: g.unit,
			riverMile: g.riverMile,
		})),
		[gauges],
	);
	const spineDams: SpineDam[] = useMemo(
		() => dams.map(d => ({
			id: d.id,
			name: d.name,
			riverMile: d.riverMile,
			position: d.position ?? 'unknown',
			notes: d.notes ?? '',
		})),
		[dams],
	);

	return (
		<div
			ref={ref}
			style={{
				position: 'relative',
				width: '100%',
				minHeight: spine.totalHeightPx,
				padding: '8px 0 64px',
			}}
		>
			<CorridorSpine
				points={spine.points}
				path={spine.path}
				totalHeightPx={spine.totalHeightPx}
				laneHalfWidthPx={laneHalfWidthPx}
				pixelsPerMile={pixelsPerMile}
				sectionRanges={childAdjustedRanges}
				sections={spineSections}
				accessPoints={spineAps}
				gauges={spineGauges}
				dams={spineDams}
				activeMile={activeMile}
				activeSectionId={activeSectionId}
				onSelectMile={scrollToMile}
			/>
		</div>
	);
}
