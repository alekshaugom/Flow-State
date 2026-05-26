import { useMemo } from 'react';
import { STATUS_COLORS, mapStatusToDesign } from '../constants';
import type { SpinePoint } from '../lib/corridor-spine-pure.ts';
import { pointAtMile } from '../lib/corridor-spine-pure.ts';
import type { SectionRange } from '../lib/corridor-assembly-pure.ts';

export interface SpineSection {
	id: string;
	name: string;
	parentSectionId: string | null;
	status: string;
	corridorMileSpan: { startMile: number | null; endMile: number | null };
}

export interface SpineAccessPoint {
	id: string;
	name: string;
	kind: string;
	riverMile: number | null;
}

export interface SpineGauge {
	id: string;
	name: string;
	currentFlow: number | null;
	unit: string;
	riverMile: number | null;
}

export interface SpineDam {
	id: string;
	name: string;
	riverMile: number | null;
	position: string;
	notes: string;
}

interface CorridorSpineProps {
	points: SpinePoint[];
	path: string;
	totalHeightPx: number;
	laneHalfWidthPx: number;
	pixelsPerMile: number;
	sectionRanges: SectionRange[];
	sections: SpineSection[];
	accessPoints: SpineAccessPoint[];
	gauges: SpineGauge[];
	dams: SpineDam[];
	activeMile: number | null;
	activeSectionId: string | null;
	onSelectMile?: (mile: number) => void;
}

const BAND_WIDTH = 8;
const BAND_LEFT_OFFSET = -88; // px to the left of the path centerline
const LABEL_LEFT_OFFSET = -98;
const LABEL_RIGHT_OFFSET = 14;
const AP_RADIUS = 4.5;
const AP_RADIUS_ACTIVE = 6;

export function CorridorSpine({
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
	onSelectMile,
}: CorridorSpineProps) {
	const sectionById = useMemo(() => {
		const m = new Map<string, SpineSection>();
		for (const s of sections) m.set(s.id, s);
		return m;
	}, [sections]);

	const viewBoxWidth = laneHalfWidthPx * 2 + 160; // extra room for labels on both sides
	const viewBoxXOffset = -(laneHalfWidthPx + 80);

	// Build the section-color-segmented path. For each section range that has points,
	// emit a sub-path covering just that mile slice. Use Catmull-Rom segments derived
	// from the existing points list (binary-search bounds, then thicken via segments).
	const sectionPaths = useMemo(() => {
		if (points.length === 0) return [];
		const out: { sectionId: string; status: string; isActive: boolean; subpath: string }[] = [];
		for (const r of sectionRanges) {
			const sec = sectionById.get(r.sectionId);
			if (!sec) continue;
			// Skip child sections — they overlay their parent's band
			if (sec.parentSectionId) continue;
			const a = pointAtMile(points, r.startMile);
			const b = pointAtMile(points, r.endMile);
			if (!a || !b) continue;
			// Collect intermediate vertices that fall inside (startMile, endMile)
			const inner = points.filter(p => p.mile > r.startMile && p.mile < r.endMile);
			const seg: Array<{ x: number; y: number }> = [
				{ x: a.x, y: a.y },
				...inner.map(p => ({ x: p.x, y: p.y })),
				{ x: b.x, y: b.y },
			];
			let d = `M ${seg[0].x.toFixed(2)} ${seg[0].y.toFixed(2)}`;
			// Use simple L commands for the sub-path overlay — the underlying full spine path
			// already provides the smoothed curve; this overlay just visually highlights the
			// section's stretch in its status color.
			for (let i = 1; i < seg.length; i++) {
				d += ` L ${seg[i].x.toFixed(2)} ${seg[i].y.toFixed(2)}`;
			}
			out.push({
				sectionId: sec.id,
				status: sec.status,
				isActive: sec.id === activeSectionId,
				subpath: d,
			});
		}
		return out;
	}, [points, sectionRanges, sectionById, activeSectionId]);

	const markers = useMemo(() => {
		const aps = accessPoints
			.filter(ap => ap.riverMile !== null)
			.map(ap => {
				const p = pointAtMile(points, ap.riverMile!);
				return p ? { ap, x: p.x, y: p.y } : null;
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		const gs = gauges
			.filter(g => g.riverMile !== null)
			.map(g => {
				const p = pointAtMile(points, g.riverMile!);
				return p ? { gauge: g, x: p.x, y: p.y } : null;
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		const ds = dams
			.filter(d => d.riverMile !== null)
			.map(d => {
				const p = pointAtMile(points, d.riverMile!);
				return p ? { dam: d, x: p.x, y: p.y } : null;
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		return { aps, gs, ds };
	}, [points, accessPoints, gauges, dams]);

	// Section labels — placed at section midpoint mile, on the right side of the lane.
	const sectionLabels = useMemo(() => {
		const out: { sectionId: string; name: string; y: number; isChild: boolean; isActive: boolean }[] = [];
		for (const r of sectionRanges) {
			const sec = sectionById.get(r.sectionId);
			if (!sec) continue;
			const midMile = (r.startMile + r.endMile) / 2;
			const p = pointAtMile(points, midMile);
			if (!p) continue;
			out.push({
				sectionId: sec.id,
				name: sec.name,
				y: p.y,
				isChild: !!sec.parentSectionId,
				isActive: sec.id === activeSectionId,
			});
		}
		return out;
	}, [sectionRanges, points, sectionById, activeSectionId]);

	// Position-indicator dot at active mile
	const dotPos = useMemo(() => {
		if (activeMile === null) return null;
		return pointAtMile(points, activeMile);
	}, [points, activeMile]);

	if (points.length === 0) {
		return <div style={{ padding: 24, color: 'var(--ink-3)' }}>No corridor geometry available.</div>;
	}

	return (
		<svg
			viewBox={`${viewBoxXOffset} -16 ${viewBoxWidth} ${totalHeightPx + 32}`}
			width="100%"
			style={{ display: 'block', overflow: 'visible' }}
			role="img"
			aria-label="River corridor spine"
		>
			{/* Section status bands — vertical bars to the left of the spine path */}
			{sectionRanges.map(r => {
				const sec = sectionById.get(r.sectionId);
				if (!sec) return null;
				const design = mapStatusToDesign(sec.status);
				const colors = STATUS_COLORS[design];
				const y1 = r.startMile * pixelsPerMile;
				const y2 = r.endMile * pixelsPerMile;
				const isChild = !!sec.parentSectionId;
				const isActive = sec.id === activeSectionId;
				return (
					<rect
						key={`band-${r.sectionId}`}
						x={isChild ? BAND_LEFT_OFFSET + BAND_WIDTH + 4 : BAND_LEFT_OFFSET}
						y={y1}
						width={isChild ? BAND_WIDTH - 3 : BAND_WIDTH}
						height={Math.max(2, y2 - y1)}
						rx={2}
						fill={colors.solid}
						opacity={isActive ? 1 : 0.55}
						style={{ cursor: onSelectMile ? 'pointer' : 'default', transition: 'opacity 120ms ease-out' }}
						onClick={onSelectMile ? () => onSelectMile((r.startMile + r.endMile) / 2) : undefined}
					/>
				);
			})}

			{/* Spine: neutral base path + colored sub-paths per section */}
			<path d={path} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
			{sectionPaths.map(sp => {
				const design = mapStatusToDesign(sp.status);
				const colors = STATUS_COLORS[design];
				return (
					<path
						key={`spath-${sp.sectionId}`}
						d={sp.subpath}
						fill="none"
						stroke={colors.solid}
						strokeWidth={sp.isActive ? 5 : 3}
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity={sp.isActive ? 0.95 : 0.75}
						style={{ transition: 'stroke-width 120ms ease-out, opacity 120ms ease-out' }}
					/>
				);
			})}

			{/* Dam markers — short hatched bar across the lane */}
			{markers.ds.map(({ dam, x, y }) => (
				<g key={`dam-${dam.id}`}>
					<rect
						x={x - 14}
						y={y - 5}
						width={28}
						height={10}
						fill="var(--ink-1)"
						opacity={0.85}
						stroke="var(--ink-0)"
						strokeWidth={1}
					/>
					<text x={x + 18} y={y + 4} fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink-2)">
						{dam.name}
					</text>
				</g>
			))}

			{/* Gauge markers — tick + flow readout */}
			{markers.gs.map(({ gauge, x, y }) => (
				<g key={`gauge-${gauge.id}`}>
					<line x1={x - 10} y1={y} x2={x + 10} y2={y} stroke="var(--river-600)" strokeWidth={2} />
					<circle cx={x} cy={y} r={3} fill="var(--river-600)" />
					{gauge.currentFlow !== null && (
						<text x={x + 14} y={y - 4} fontSize={10} fontFamily="var(--font-mono)" fill="var(--river-700)">
							{Math.round(gauge.currentFlow)} {gauge.unit}
						</text>
					)}
				</g>
			))}

			{/* Access-point markers — circle + name */}
			{markers.aps.map(({ ap, x, y }) => {
				const isPutIn = ap.kind === 'put-in' || ap.kind === 'both';
				return (
					<g key={`ap-${ap.id}`}>
						<circle
							cx={x}
							cy={y}
							r={AP_RADIUS}
							fill={isPutIn ? 'var(--bg-card)' : 'var(--ink-1)'}
							stroke="var(--ink-1)"
							strokeWidth={1.5}
						/>
					</g>
				);
			})}

			{/* Section labels on the right side */}
			{sectionLabels.map(lbl => (
				<text
					key={`lbl-${lbl.sectionId}`}
					x={LABEL_RIGHT_OFFSET + (lbl.isChild ? 12 : 0)}
					y={lbl.y + 3}
					fontSize={lbl.isChild ? 10 : 11}
					fontFamily="var(--font-sans)"
					fontWeight={lbl.isActive ? 600 : 400}
					fill={lbl.isActive ? 'var(--ink-0)' : (lbl.isChild ? 'var(--ink-3)' : 'var(--ink-2)')}
					style={{ cursor: onSelectMile ? 'pointer' : 'default' }}
					onClick={onSelectMile ? () => {
						const r = sectionRanges.find(sr => sr.sectionId === lbl.sectionId);
						if (r) onSelectMile((r.startMile + r.endMile) / 2);
					} : undefined}
				>
					{lbl.name}
				</text>
			))}

			{/* Active mile position dot — moves with scroll */}
			{dotPos && (
				<g style={{ pointerEvents: 'none' }}>
					<circle cx={dotPos.x} cy={dotPos.y} r={AP_RADIUS_ACTIVE + 4} fill="var(--river-500)" opacity={0.18} />
					<circle cx={dotPos.x} cy={dotPos.y} r={AP_RADIUS_ACTIVE} fill="var(--river-600)" stroke="var(--bg-card)" strokeWidth={2} />
				</g>
			)}
		</svg>
	);
}
