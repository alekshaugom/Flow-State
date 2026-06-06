import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BigCFS } from './BigCFS';
import { StatusPill } from './StatusPill';
import { Sparkline } from './Sparkline';
import { TrendChip } from './TrendChip';
import { mapStatusToDesign } from '../constants';
import { useActiveMile } from '../hooks/useActiveMile';
import { RIVER_GEOMETRIES } from '../lib/river-geometries.ts';
import { assembleCorridorPolyline, type SectionForAssembly, type SectionRange } from '../lib/corridor-assembly-pure.ts';
import { buildSpinePath, catmullRomPath, type SpinePoint } from '../lib/corridor-spine-pure.ts';
import { HomeCorridorSpineSvg, type HomeSpineSection, type HomeSpineAccessPoint, type HomeSpineGauge, type HomeSpineDam } from './HomeCorridorSpineSvg';
import type { CorridorTileData, TileLeg, TileAccessPoint, TileGauge, TileImpassableDam } from './CorridorTile';

interface HomeCorridorSpineTileProps {
	tile: CorridorTileData & {
		legs: Array<TileLeg & { parentSectionId?: string | null; corridorMileSpan?: { startMile: number | null; endMile: number | null } }>;
	};
	density?: 'desktop' | 'mobile';
}

const TARGET_PPM = 10;
const LANE_HALF_WIDTH = 40;

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

const subtleNote: React.CSSProperties = {
	margin: '2px 0 0',
	fontSize: 12,
	fontStyle: 'italic',
	color: 'var(--ink-3)',
	lineHeight: 1.5,
};

export function HomeCorridorSpineTile({ tile, density = 'desktop' }: HomeCorridorSpineTileProps) {
	const navigate = useNavigate();

	// Top-level sections only (homepage hides hierarchical children for compactness).
	const topLevelLegs = useMemo(
		() => tile.legs.filter(l => !l.parentSectionId).sort((a, b) => a.sortIndex - b.sortIndex),
		[tile.legs],
	);

	// Build assembly using existing geometry data.
	const assembly = useMemo(() => {
		const sectionShapes: SectionForAssembly[] = topLevelLegs.map(l => ({
			id: l.sectionId,
			sortIndex: l.sortIndex,
			parentSectionId: null,
			lengthMiles: l.lengthMiles ?? null,
		}));
		return assembleCorridorPolyline(sectionShapes, RIVER_GEOMETRIES);
	}, [topLevelLegs]);

	const rawSpine = useMemo(() => {
		return buildSpinePath(assembly.polyline, {
			pixelsPerMile: TARGET_PPM,
			laneHalfWidthPx: LANE_HALF_WIDTH,
		});
	}, [assembly.polyline]);

	// Rescale the mile axis so each section spans its real lengthMiles. The
	// haversine cumulative miles from the polyline can over- or under-shoot the
	// boating "section length" (e.g., a meandering Bighorn polyline overshoots,
	// a simplified Numbers polyline undershoots). Without this remap, scroll
	// position doesn't match the user's mental model of section length.
	const scaledRanges = useMemo(() => {
		let cursor = 0;
		return assembly.sectionRanges.map(r => {
			const leg = topLevelLegs.find(l => l.sectionId === r.sectionId);
			const fallback = r.endMile - r.startMile;
			const lengthMi = (leg?.lengthMiles && leg.lengthMiles > 0) ? leg.lengthMiles : fallback;
			const out = {
				sectionId: r.sectionId,
				startMile: cursor,
				endMile: cursor + lengthMi,
				hasGeometry: r.hasGeometry,
				origStart: r.startMile,
				origEnd: r.endMile,
			};
			cursor += lengthMi;
			return out;
		});
	}, [assembly.sectionRanges, topLevelLegs]);

	const scaledTotalMiles = scaledRanges.length > 0
		? scaledRanges[scaledRanges.length - 1].endMile
		: 0;

	const remapMile = useMemo(() => {
		return (origMile: number): number => {
			for (const r of scaledRanges) {
				if (origMile >= r.origStart && origMile <= r.origEnd) {
					const origSpan = r.origEnd - r.origStart;
					const frac = origSpan > 0 ? (origMile - r.origStart) / origSpan : 0;
					return r.startMile + frac * (r.endMile - r.startMile);
				}
			}
			// Outside any section — clamp to nearest section's edge
			if (scaledRanges.length === 0) return origMile;
			if (origMile < scaledRanges[0].origStart) return scaledRanges[0].startMile;
			return scaledRanges[scaledRanges.length - 1].endMile;
		};
	}, [scaledRanges]);

	const spine = useMemo(() => {
		const newPoints: SpinePoint[] = rawSpine.points.map(p => {
			const newMile = remapMile(p.mile);
			return { x: p.x, y: newMile * TARGET_PPM, mile: newMile };
		});
		const newPath = catmullRomPath(newPoints);
		return {
			points: newPoints,
			path: newPath,
			totalHeightPx: scaledTotalMiles * TARGET_PPM,
		};
	}, [rawSpine.points, remapMile, scaledTotalMiles]);

	const renderSectionRanges: SectionRange[] = useMemo(
		() => scaledRanges.map(r => ({
			sectionId: r.sectionId,
			startMile: r.startMile,
			endMile: r.endMile,
			hasGeometry: r.hasGeometry,
		})),
		[scaledRanges],
	);

	// Remap AP / gauge / dam river-miles into the scaled space. Each marker
	// belongs to one scaled section (whichever section's real river-mile range
	// contains it); within that section, we scale linearly.
	const remapRiverMile = useMemo(() => {
		const legByRiverMile = scaledRanges
			.map(sr => {
				const leg = topLevelLegs.find(l => l.sectionId === sr.sectionId);
				return {
					scaledRange: sr,
					realStart: leg?.corridorMileSpan?.startMile ?? null,
					realEnd: leg?.corridorMileSpan?.endMile ?? null,
				};
			})
			.filter(e => e.realStart != null && e.realEnd != null) as Array<{ scaledRange: typeof scaledRanges[number]; realStart: number; realEnd: number }>;

		// Build a global piecewise-linear mapping by walking the entries in
		// downstream order. For APs that fall outside any section's real-mile
		// range (e.g. in unmodeled gaps between sections), extrapolate linearly
		// from the nearest boundary so they still get a sensible spine position.
		const sortedByReal = [...legByRiverMile].sort((a, b) => a.realStart - b.realStart);
		const realMin = sortedByReal[0]?.realStart ?? 0;
		const realMax = sortedByReal[sortedByReal.length - 1]?.realEnd ?? 0;
		const realSpan = realMax - realMin;
		const scaledMin = sortedByReal[0]?.scaledRange.startMile ?? 0;
		const scaledMax = sortedByReal[sortedByReal.length - 1]?.scaledRange.endMile ?? 0;
		const scaledSpan = scaledMax - scaledMin;

		return (riverMile: number | null): number | null => {
			if (riverMile == null) return null;
			for (const entry of sortedByReal) {
				if (riverMile >= entry.realStart && riverMile <= entry.realEnd) {
					const sectionRealSpan = entry.realEnd - entry.realStart;
					const frac = sectionRealSpan > 0 ? (riverMile - entry.realStart) / sectionRealSpan : 0;
					return entry.scaledRange.startMile + frac * (entry.scaledRange.endMile - entry.scaledRange.startMile);
				}
			}
			// Fallback: linear extrapolation from the corridor's overall real-vs-scaled span.
			if (realSpan > 0) {
				const frac = (riverMile - realMin) / realSpan;
				return scaledMin + Math.max(0, Math.min(1, frac)) * scaledSpan;
			}
			return null;
		};
	}, [scaledRanges, topLevelLegs]);

	const { ref, activeMile, scrollToMile } = useActiveMile({
		totalMiles: scaledTotalMiles,
		pixelsPerMile: TARGET_PPM,
	});


	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

	// Derive active section from activeMile (scaled).
	useEffect(() => {
		if (activeMile === null) {
			if (!activeSectionId && topLevelLegs.length > 0) setActiveSectionId(topLevelLegs[0].sectionId);
			return;
		}
		for (const r of scaledRanges) {
			if (activeMile >= r.startMile && activeMile <= r.endMile) {
				if (r.sectionId !== activeSectionId) setActiveSectionId(r.sectionId);
				return;
			}
		}
	}, [activeMile, scaledRanges, topLevelLegs, activeSectionId]);

	const activeLeg = useMemo(
		() => topLevelLegs.find(l => l.sectionId === activeSectionId) ?? topLevelLegs[0] ?? null,
		[topLevelLegs, activeSectionId],
	);

	// Active gauge follows the active section's primaryGaugeId.
	const activeGauge = useMemo(() => {
		if (!activeLeg?.primaryGaugeId) return null;
		return tile.gauges.find(g => g.id === activeLeg.primaryGaugeId) ?? null;
	}, [activeLeg, tile.gauges]);

	const fallbackHasGeometry = topLevelLegs.some(l => RIVER_GEOMETRIES[l.sectionId]?.length);

	// Render-prep
	const spineSections: HomeSpineSection[] = topLevelLegs.map(l => ({
		id: l.sectionId,
		name: l.name,
		status: l.status,
	}));
	const spineAps: HomeSpineAccessPoint[] = (tile.accessPoints || []).map((ap: TileAccessPoint) => ({
		id: ap.id,
		name: ap.name,
		kind: ap.kind,
		riverMile: remapRiverMile(ap.riverMile),
	}));
	const spineGauges: HomeSpineGauge[] = (tile.gauges || []).map((g: TileGauge) => ({
		id: g.id,
		name: g.name,
		currentFlow: g.currentFlow,
		unit: g.unit,
		riverMile: remapRiverMile(g.riverMile),
	}));
	const spineDams: HomeSpineDam[] = (tile.impassableDams || []).map((d: TileImpassableDam) => ({
		id: d.id,
		name: d.name,
		riverMile: remapRiverMile(d.riverMile),
	}));

	const tileHref = `/corridor/${tile.corridorId}`;
	const activeDesign = activeLeg ? mapStatusToDesign(activeLeg.status) : 'low';

	if (!fallbackHasGeometry) {
		// No geometry yet — render a minimal placeholder card so the page still works.
		return (
			<article style={cardOuter(density)}>
				<header style={tileHeader}>
					<div style={eyebrow}>{tile.watershedName || ''} · {tile.driver || 'mixed'}</div>
					<h2 style={tileHeading(density)}>
						<Link to={tileHref} style={{ color: 'inherit', textDecoration: 'none' }}>{tile.name}</Link>
					</h2>
					{tile.description && <p style={tileDescription}>{tile.description}</p>}
				</header>
				<div style={{ padding: 16, color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
					Spine geometry coming soon — open the corridor page for the section list.
				</div>
			</article>
		);
	}

	return (
		<article style={cardOuter(density)}>
			<header style={tileHeader}>
				<div style={eyebrow}>{tile.watershedName || ''} · {tile.driver || 'mixed'}</div>
				<div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
					<h2 style={tileHeading(density)}>
						<Link to={tileHref} style={{ color: 'inherit', textDecoration: 'none' }}>{tile.name}</Link>
					</h2>
					<Link to={tileHref} style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
						all sections →
					</Link>
				</div>
				{tile.description && <p style={tileDescription}>{tile.description}</p>}
			</header>

			<div style={{
				display: 'grid',
				gridTemplateColumns: density === 'desktop' ? '260px minmax(0, 1fr)' : '180px minmax(0, 1fr)',
				gap: 0,
				alignItems: 'start',
			}}>
				{/* LEFT — spine */}
				<div ref={ref} style={{
					position: 'relative',
					padding: '8px 0 16px 16px',
					borderRight: '1px solid var(--rule)',
				}}>
					<HomeCorridorSpineSvg
						points={spine.points}
						path={spine.path}
						totalHeightPx={spine.totalHeightPx}
						laneHalfWidthPx={LANE_HALF_WIDTH}
						pixelsPerMile={TARGET_PPM}
						sectionRanges={renderSectionRanges}
						sections={spineSections}
						accessPoints={spineAps}
						gauges={spineGauges}
						dams={spineDams}
						activeMile={activeMile}
						activeSectionId={activeSectionId}
						activeGaugeId={activeGauge?.id || null}
						onSelectMile={scrollToMile}
					/>
				</div>

				{/* RIGHT — section content */}
				<div style={{
					padding: density === 'desktop' ? '12px 24px 20px 24px' : '12px 16px 16px',
					position: 'sticky',
					top: density === 'desktop' ? 200 : 84,
					alignSelf: 'flex-start',
				}}>
					{activeLeg ? (
						<div
							key={activeLeg.sectionId /* re-mount on section change for the fade-in */}
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 14,
								animation: 'home-spine-fadein 220ms ease-out',
							}}
						>
							<div>
								<div style={eyebrow}>Section</div>
								<h3 style={{
									margin: '2px 0 6px',
									fontSize: density === 'desktop' ? 22 : 18,
									fontWeight: 700,
									letterSpacing: '-0.02em',
									color: 'var(--ink-0)',
								}}>
									<Link to={`/section/${activeLeg.sectionId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
										{activeLeg.name}
									</Link>
								</h3>
								<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
									<StatusPill status={activeDesign} label={activeLeg.statusLabel || undefined} size={density === 'desktop' ? 'md' : 'sm'} />
									{activeLeg.difficultyLabel && (
										<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
											{activeLeg.difficultyLabel}
										</span>
									)}
									{activeLeg.lengthMiles != null && (
										<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
											{activeLeg.lengthMiles} mi
										</span>
									)}
								</div>
							</div>

							{activeGauge && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
									<div style={eyebrow}>
										Gauge · {activeGauge.name}
									</div>
									<div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
										<BigCFS cfs={activeGauge.currentFlow !== null ? Math.round(activeGauge.currentFlow) : null} size="lg" />
										{activeGauge.trend && activeGauge.currentFlow != null && activeGauge.change24h != null && (
											<TrendChip
												trend={activeGauge.trend === 'rising' ? 'up' : activeGauge.trend === 'falling' ? 'down' : 'stable'}
												pct={Math.round((activeGauge.change24h / activeGauge.currentFlow) * 100)}
											/>
										)}
									</div>
									{activeGauge.sparkline && activeGauge.sparkline.length > 0 && (
										<Sparkline
											data={activeGauge.sparkline}
											status={activeDesign}
											width={density === 'desktop' ? 280 : 220}
											height={42}
										/>
									)}
								</div>
							)}

							{activeLeg.notes && (
								<div>
									<div style={eyebrow}>Notes</div>
									<p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>
										{activeLeg.notes}
									</p>
								</div>
							)}

							<div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
								<button
									onClick={() => navigate(`/log/new?sectionId=${encodeURIComponent(activeLeg.sectionId)}`)}
									style={logChip}
								>
									+ Log this trip
								</button>
								{activeLeg.myTripCount > 0 && (
									<span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
										{activeLeg.myTripCount} prior trip{activeLeg.myTripCount === 1 ? '' : 's'}
									</span>
								)}
							</div>
						</div>
					) : (
						<div style={{ padding: 16, color: 'var(--ink-3)', fontStyle: 'italic' }}>
							No active section.
						</div>
					)}
				</div>
			</div>

			<style>{`
				@keyframes home-spine-fadein {
					0% { opacity: 0; transform: translateY(4px); }
					100% { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</article>
	);
}

const cardOuter = (density: 'desktop' | 'mobile'): React.CSSProperties => ({
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-xl)',
	boxShadow: 'var(--shadow-card)',
	// NOTE: do NOT set `overflow: hidden` here — it breaks `position: sticky` for the
	// right-pane section card. The grid below masks any spine overflow at the rounded
	// corners via clip-path on the left column instead.
	maxWidth: density === 'desktop' ? '100%' : 720,
});

const tileHeader: React.CSSProperties = {
	padding: '16px 24px 12px',
	borderBottom: '1px solid var(--rule)',
};

const tileHeading = (density: 'desktop' | 'mobile'): React.CSSProperties => ({
	margin: '2px 0 0',
	fontSize: density === 'desktop' ? 22 : 18,
	fontWeight: 700,
	letterSpacing: '-0.02em',
	color: 'var(--ink-0)',
});

const tileDescription: React.CSSProperties = {
	margin: '6px 0 0',
	fontSize: 13,
	lineHeight: 1.55,
	color: 'var(--ink-2)',
	maxWidth: 720,
};

const logChip: React.CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 4,
	padding: '5px 12px',
	borderRadius: 'var(--r-pill)',
	background: 'var(--bg-raised)',
	border: '1px solid var(--rule)',
	color: 'var(--ink-1)',
	fontFamily: 'var(--font-sans)',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
	transition: 'background 120ms ease-out',
};
