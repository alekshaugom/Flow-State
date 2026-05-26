import { useMemo } from 'react';
import { STATUS_COLORS, mapStatusToDesign } from '../constants';
import type { SpinePoint } from '../lib/corridor-spine-pure.ts';
import { pointAtMile } from '../lib/corridor-spine-pure.ts';
import type { SectionRange } from '../lib/corridor-assembly-pure.ts';

export interface HomeSpineSection {
	id: string;
	name: string;
	status: string;
}

export interface HomeSpineAccessPoint {
	id: string;
	name: string;
	kind: string;
	riverMile: number | null;
}

export interface HomeSpineGauge {
	id: string;
	name: string;
	currentFlow: number | null;
	unit: string;
	riverMile: number | null;
}

export interface HomeSpineDam {
	id: string;
	name: string;
	riverMile: number | null;
}

interface HomeCorridorSpineSvgProps {
	points: SpinePoint[];
	path: string;
	totalHeightPx: number;
	laneHalfWidthPx: number;
	pixelsPerMile: number;
	sectionRanges: SectionRange[];
	sections: HomeSpineSection[];
	accessPoints: HomeSpineAccessPoint[];
	gauges: HomeSpineGauge[];
	dams: HomeSpineDam[];
	activeMile: number | null;
	activeSectionId: string | null;
	activeGaugeId?: string | null;
	onSelectMile?: (mile: number) => void;
}

// ── Layout constants ─────────────────────────────────────────────────
const LABEL_MIN_GAP = 16;          // vertical gap between adjacent labels in the same lane
const LABEL_MAX_NUDGE = 90;        // max vertical displacement before we accept overlap
const LABEL_MAX_CHARS = 30;        // truncation length for long names
const CLUSTER_MIN_RUN = 3;         // ≥ this many displaced labels in a row = "cluster"
const CLUSTER_JOG_X = 6;           // horizontal jog (px) at the anchor end of a clustered leader line
const AP_LABEL_PAD_X = 10;         // horizontal offset of AP label from path
const GAUGE_PILL_PAD_X = 12;       // horizontal offset of gauge pill from path
const RIGHT_LANE_X = (laneHalfWidth: number) => laneHalfWidth + AP_LABEL_PAD_X;
const LEFT_LANE_X = (laneHalfWidth: number) => -(laneHalfWidth + GAUGE_PILL_PAD_X);

// Truncate a label to LABEL_MAX_CHARS, replacing the cut-off tail with an ellipsis.
function truncateLabel(name: string): string {
	if (name.length <= LABEL_MAX_CHARS) return name;
	return name.slice(0, LABEL_MAX_CHARS - 1).trimEnd() + '…';
}

// Resolve vertical overlaps within a sorted list of items.
// Each item has an anchor `y` (where it sits on the path) and gets an `adjustedY`
// pushed down to maintain MIN_GAP. Also flags each item with `inCluster` = true when
// it belongs to a run of ≥ CLUSTER_MIN_RUN consecutive displaced labels — the renderer
// uses this to draw a jogged leader line instead of a straight diagonal so a thick
// cluster doesn't degrade into a tangle of crossing lines.
function resolveLane<T extends { y: number }>(items: T[]): Array<T & { adjustedY: number; inCluster: boolean }> {
	const sorted = items.map((it, idx) => ({ it, idx, y: it.y })).sort((a, b) => a.y - b.y);
	let lastY = -Infinity;
	const placed = sorted.map(({ it, idx, y }) => {
		const adjusted = y < lastY + LABEL_MIN_GAP ? lastY + LABEL_MIN_GAP : y;
		lastY = adjusted;
		return { it, idx, y, adjustedY: adjusted, displaced: Math.abs(adjusted - y) > 0.5 };
	});
	// Mark runs of CLUSTER_MIN_RUN+ consecutive displaced items as in-cluster.
	const inCluster = new Array<boolean>(placed.length).fill(false);
	let runStart = 0;
	for (let i = 0; i <= placed.length; i++) {
		const ending = i === placed.length || !placed[i].displaced;
		if (ending) {
			const runLen = i - runStart;
			if (runLen >= CLUSTER_MIN_RUN) {
				for (let j = runStart; j < i; j++) inCluster[j] = true;
			}
			runStart = i + 1;
		}
	}
	// Restore original order
	const out = placed.map((p, sortedIdx) => ({ ...p, inCluster: inCluster[sortedIdx] }));
	out.sort((a, b) => a.idx - b.idx);
	return out.map(p => ({ ...p.it, adjustedY: p.adjustedY, inCluster: p.inCluster }));
}

export function HomeCorridorSpineSvg({
	points,
	path,
	totalHeightPx,
	laneHalfWidthPx,
	pixelsPerMile,
	sectionRanges,
	sections,
	accessPoints,
	gauges,
	dams,
	activeMile,
	activeSectionId,
	activeGaugeId,
	onSelectMile,
}: HomeCorridorSpineSvgProps) {
	const sectionById = useMemo(() => {
		const m = new Map<string, HomeSpineSection>();
		for (const s of sections) m.set(s.id, s);
		return m;
	}, [sections]);

	// Map each section range's mile range → section IDs the AP/gauge mile falls into.
	// We use this to identify "active section" markers for opacity.
	const sectionRangeForMile = useMemo(() => {
		return (mile: number): string | null => {
			for (const r of sectionRanges) {
				if (mile >= r.startMile && mile <= r.endMile) return r.sectionId;
			}
			return null;
		};
	}, [sectionRanges]);

	// viewBox needs room for labels on both sides: ~160 px right (longer AP names)
	// and ~160 px left (gauge pills can be wide with "1,234 cfs").
	const rightGutter = 160;
	const leftGutter = 160;
	const viewBoxXOffset = -(laneHalfWidthPx + leftGutter);
	const viewBoxWidth = laneHalfWidthPx * 2 + leftGutter + rightGutter;

	// Section sub-paths: emit a colored slice of the spine path for each section's mile range.
	const sectionPaths = useMemo(() => {
		if (points.length === 0) return [];
		const out: { sectionId: string; status: string; isActive: boolean; subpath: string }[] = [];
		for (const r of sectionRanges) {
			const sec = sectionById.get(r.sectionId);
			if (!sec) continue;
			const a = pointAtMile(points, r.startMile);
			const b = pointAtMile(points, r.endMile);
			if (!a || !b) continue;
			const inner = points.filter(p => p.mile > r.startMile && p.mile < r.endMile);
			const seg = [
				{ x: a.x, y: a.y },
				...inner.map(p => ({ x: p.x, y: p.y })),
				{ x: b.x, y: b.y },
			];
			let d = `M ${seg[0].x.toFixed(2)} ${seg[0].y.toFixed(2)}`;
			for (let i = 1; i < seg.length; i++) d += ` L ${seg[i].x.toFixed(2)} ${seg[i].y.toFixed(2)}`;
			out.push({
				sectionId: sec.id,
				status: sec.status,
				isActive: sec.id === activeSectionId,
				subpath: d,
			});
		}
		return out;
	}, [points, sectionRanges, sectionById, activeSectionId]);

	// Right lane: access-point labels. Each AP sits on the path at (anchorX, y) and
	// its label is placed at (RIGHT_LANE_X, adjustedY) after collision resolution.
	const apMarkers = useMemo(() => {
		const raw = accessPoints
			.filter(ap => ap.riverMile !== null)
			.map(ap => {
				const p = pointAtMile(points, ap.riverMile!);
				if (!p) return null;
				const sectionId = sectionRangeForMile(ap.riverMile!);
				return {
					id: ap.id,
					name: ap.name,
					kind: ap.kind,
					anchorX: p.x,
					y: p.y,
					sectionId,
					isInActiveSection: sectionId === activeSectionId,
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		return resolveLane(raw);
	}, [points, accessPoints, sectionRangeForMile, activeSectionId]);

	// Left lane: gauges (pill + tick). Pill sits at (LEFT_LANE_X, adjustedY) extending
	// left, with a tick on the path at (anchorX, y).
	const gaugeMarkers = useMemo(() => {
		const raw = gauges
			.filter(g => g.riverMile !== null)
			.map(g => {
				const p = pointAtMile(points, g.riverMile!);
				if (!p) return null;
				return {
					id: g.id,
					name: g.name,
					currentFlow: g.currentFlow,
					unit: g.unit,
					anchorX: p.x,
					y: p.y,
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		return resolveLane(raw);
	}, [points, gauges]);

	// Dams: render the cross-bar on the path at the actual mile, but route the text
	// label through the left lane alongside gauges so it participates in collision
	// resolution. (We resolve dams jointly with gauges for shared left-side flow.)
	const damMarkers = useMemo(() => {
		const raw = dams
			.filter(d => d.riverMile !== null)
			.map(d => {
				const p = pointAtMile(points, d.riverMile!);
				if (!p) return null;
				return {
					id: d.id,
					name: d.name,
					anchorX: p.x,
					y: p.y,
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		return resolveLane(raw);
	}, [points, dams]);

	const dotPos = useMemo(() => {
		if (activeMile === null) return null;
		return pointAtMile(points, activeMile);
	}, [points, activeMile]);

	if (points.length === 0) {
		return (
			<div style={{ padding: 16, color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic' }}>
				No spine geometry.
			</div>
		);
	}

	const rightLaneX = RIGHT_LANE_X(laneHalfWidthPx);
	const leftLaneX = LEFT_LANE_X(laneHalfWidthPx);

	return (
		<svg
			viewBox={`${viewBoxXOffset} -12 ${viewBoxWidth} ${totalHeightPx + 24}`}
			width="100%"
			style={{ display: 'block', overflow: 'visible' }}
			role="img"
			aria-label="River corridor spine"
		>
			{/* Neutral underlay path */}
			<path
				d={path}
				fill="none"
				stroke="var(--ink-3)"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={0.25}
			/>

			{/* Per-section colored sub-paths */}
			{sectionPaths.map(sp => {
				const design = mapStatusToDesign(sp.status);
				const colors = STATUS_COLORS[design];
				return (
					<path
						key={`spath-${sp.sectionId}`}
						d={sp.subpath}
						fill="none"
						stroke={colors.solid}
						strokeWidth={sp.isActive ? 4 : 2.5}
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity={sp.isActive ? 0.95 : 0.7}
						style={{ transition: 'stroke-width 160ms ease-out, opacity 160ms ease-out', cursor: onSelectMile ? 'pointer' : 'default' }}
						onClick={onSelectMile ? () => {
							const r = sectionRanges.find(rr => rr.sectionId === sp.sectionId);
							if (r) onSelectMile((r.startMile + r.endMile) / 2);
						} : undefined}
					/>
				);
			})}

			{/* Dam markers — bar on path + label on left lane (with leader line when displaced) */}
			{damMarkers.map(dam => {
				const displaced = Math.abs(dam.adjustedY - dam.y) > 0.5;
				const showLabel = Math.abs(dam.adjustedY - dam.y) <= LABEL_MAX_NUDGE;
				return (
					<g key={`dam-${dam.id}`}>
						<rect x={dam.anchorX - 10} y={dam.y - 3} width={20} height={6} fill="var(--ink-1)" />
						{showLabel && (
							<>
								{displaced && (
									dam.inCluster ? (
										<path
											d={`M ${dam.anchorX - 10},${dam.y} L ${dam.anchorX - 10 - CLUSTER_JOG_X},${dam.y} L ${leftLaneX + 4},${dam.adjustedY}`}
											fill="none"
											stroke="var(--ink-3)"
											strokeWidth={0.75}
											opacity={0.5}
										/>
									) : (
										<line
											x1={dam.anchorX - 10}
											y1={dam.y}
											x2={leftLaneX + 4}
											y2={dam.adjustedY}
											stroke="var(--ink-3)"
											strokeWidth={0.75}
											opacity={0.5}
										/>
									)
								)}
								<text
									x={leftLaneX}
									y={dam.adjustedY + 3}
									fontSize={9}
									fontFamily="var(--font-mono)"
									fill="var(--ink-2)"
									textAnchor="end"
								>
									{truncateLabel(dam.name)}
								</text>
							</>
						)}
					</g>
				);
			})}

			{/* Gauge pills — tick on path, pill on left lane (with leader line when displaced) */}
			{gaugeMarkers.map(g => {
				const isActive = activeGaugeId ? g.id === activeGaugeId : false;
				const flowText = g.currentFlow !== null
					? `${Math.round(g.currentFlow).toLocaleString()} ${g.unit}`
					: `— ${g.unit}`;
				const pillWidth = flowText.length * 6.5 + 14;
				const displaced = Math.abs(g.adjustedY - g.y) > 0.5;
				const showLabel = Math.abs(g.adjustedY - g.y) <= LABEL_MAX_NUDGE;
				const pillX = leftLaneX - pillWidth;
				return (
					<g key={`gauge-${g.id}`}>
						{/* Tick on the path */}
						<line x1={g.anchorX - 9} y1={g.y} x2={g.anchorX + 9} y2={g.y} stroke="var(--river-600)" strokeWidth={1.5} />
						{showLabel && (
							<>
								{displaced && (
									g.inCluster ? (
										<path
											d={`M ${g.anchorX - 9},${g.y} L ${g.anchorX - 9 - CLUSTER_JOG_X},${g.y} L ${leftLaneX - 4},${g.adjustedY}`}
											fill="none"
											stroke="var(--river-600)"
											strokeWidth={0.75}
											opacity={0.5}
										/>
									) : (
										<line
											x1={g.anchorX - 9}
											y1={g.y}
											x2={leftLaneX - 4}
											y2={g.adjustedY}
											stroke="var(--river-600)"
											strokeWidth={0.75}
											opacity={0.5}
										/>
									)
								)}
								<rect
									x={pillX}
									y={g.adjustedY - 9}
									width={pillWidth}
									height={18}
									rx={9}
									fill={isActive ? 'var(--river-600)' : 'var(--bg-card)'}
									stroke="var(--river-600)"
									strokeWidth={1}
									style={{ transition: 'fill 160ms ease-out' }}
								/>
								<text
									x={pillX + pillWidth / 2}
									y={g.adjustedY + 3}
									fontSize={10}
									fontFamily="var(--font-mono)"
									fontWeight={600}
									fill={isActive ? 'white' : 'var(--river-700)'}
									textAnchor="middle"
									style={{ transition: 'fill 160ms ease-out' }}
								>
									{flowText}
								</text>
							</>
						)}
					</g>
				);
			})}

			{/* AP markers — circle on path + label on right lane (with leader line when displaced) */}
			{apMarkers.map(ap => {
				const isPutIn = ap.kind === 'put-in' || ap.kind === 'both';
				const displaced = Math.abs(ap.adjustedY - ap.y) > 0.5;
				const opacity = ap.isInActiveSection ? 1 : 0.7;
				return (
					<g key={`ap-${ap.id}`} style={{ opacity, transition: 'opacity 160ms ease-out' }}>
						<circle
							cx={ap.anchorX}
							cy={ap.y}
							r={3.5}
							fill={isPutIn ? 'var(--bg-card)' : 'var(--ink-1)'}
							stroke="var(--ink-1)"
							strokeWidth={1.25}
						/>
						{displaced && (
							ap.inCluster ? (
								<path
									d={`M ${ap.anchorX + 4},${ap.y} L ${ap.anchorX + 4 + CLUSTER_JOG_X},${ap.y} L ${rightLaneX - 4},${ap.adjustedY}`}
									fill="none"
									stroke="var(--ink-3)"
									strokeWidth={0.75}
									opacity={0.5}
								/>
							) : (
								<line
									x1={ap.anchorX + 4}
									y1={ap.y}
									x2={rightLaneX - 4}
									y2={ap.adjustedY}
									stroke="var(--ink-3)"
									strokeWidth={0.75}
									opacity={0.5}
								/>
							)
						)}
						<text
							x={rightLaneX}
							y={ap.adjustedY + 3}
							fontSize={10}
							fontFamily="var(--font-sans)"
							fill={ap.isInActiveSection ? 'var(--ink-1)' : 'var(--ink-2)'}
							textAnchor="start"
						>
							{truncateLabel(ap.name)}
						</text>
					</g>
				);
			})}

			{/* Active mile position dot */}
			{dotPos && (
				<g style={{ pointerEvents: 'none' }}>
					<circle cx={dotPos.x} cy={dotPos.y} r={9} fill="var(--river-500)" opacity={0.18} />
					<circle cx={dotPos.x} cy={dotPos.y} r={5.5} fill="var(--river-600)" stroke="var(--bg-card)" strokeWidth={2} />
				</g>
			)}
		</svg>
	);
}
