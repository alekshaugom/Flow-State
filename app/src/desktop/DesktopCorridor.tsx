import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCorridor } from '../hooks/useCorridor';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';
import { CorridorSpineColumn } from '../components/CorridorSpineColumn';
import { CorridorSpineDetailPane } from '../components/CorridorSpineDetailPane';
import { type CorridorMapSection, type CorridorMapAccessPoint, type CorridorMapDam, type CorridorMapGauge } from '../components/CorridorMap';
import { CorridorMapColumn } from '../components/CorridorMapColumn';
import { RIVER_GEOMETRIES } from '../lib/river-geometries.ts';
import { assembleCorridorPolyline, type SectionForAssembly } from '../lib/corridor-assembly-pure.ts';

interface DesktopCorridorProps {
	slug: string;
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

export function DesktopCorridor({ slug }: DesktopCorridorProps) {
	const USE_MAP_TILES = slug === 'arkansas-headwaters';

	const { data, isLoading, error } = useCorridor(slug);
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();

	// Scroll-driven header state.
	const [scrollY, setScrollY] = useState(0);
	const rafRef = useRef<number>(0);
	useEffect(() => {
		const onScroll = () => {
			if (rafRef.current) return;
			rafRef.current = requestAnimationFrame(() => {
				setScrollY(window.scrollY);
				rafRef.current = 0;
			});
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	if (error) {
		return (
			<div style={{ width: '100%', height: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
				<AppHeader activePage="rivers" />
				<div style={{ padding: 40, textAlign: 'center', color: 'var(--danger-solid)' }}>
					Failed to load corridor.
				</div>
			</div>
		);
	}

	const corridor = data?.corridor;
	const sections: any[] = data?.sections || [];
	const accessPoints: any[] = data?.accessPoints || [];
	const gauges: any[] = data?.gauges || [];
	const dams: any[] = data?.impassableDams || [];
	const breadcrumb = data?.breadcrumb || [];

	// Pre-select the first top-level section so the right pane isn't empty before first scroll.
	useEffect(() => {
		if (activeSectionId === null && sections.length > 0) {
			const firstTop = sections.find((s: any) => !s.parentSectionId);
			if (firstTop) setActiveSectionId(firstTop.id);
		}
	}, [sections, activeSectionId]);

	// Decide whether to render the spine: any top-level section in this corridor needs geometry data.
	const hasAnyGeometry = useMemo(() => {
		return sections.some((s: any) => !s.parentSectionId && RIVER_GEOMETRIES[s.id]?.length);
	}, [sections]);

	// For the map-tiles path: assemble the corridor polyline from section geometries.
	// Returns a [lng, lat, cumMile][] tuple array for CorridorMap.
	const { corridorPolyline, assembly } = useMemo(() => {
		if (!USE_MAP_TILES) return { corridorPolyline: [] as Array<[number, number, number]>, assembly: null };
		const sectionShapes: SectionForAssembly[] = sections.map((s: any) => ({
			id: s.id,
			sortIndex: s.sortIndex ?? 0,
			parentSectionId: s.parentSectionId ?? null,
			lengthMiles: s.lengthMiles ?? null,
		}));
		const asm = assembleCorridorPolyline(sectionShapes, RIVER_GEOMETRIES);
		// Zip with cumulative miles to produce the [lng, lat, cumMile] triples.
		const poly: Array<[number, number, number]> = asm.polyline.map(
			(pt, i) => [pt[0], pt[1], asm.cumulativeMiles[i] ?? 0],
		);
		return { corridorPolyline: poly, assembly: asm };
	}, [USE_MAP_TILES, sections]);

	// Build overlay data arrays for CorridorMap from useCorridor() response.
	// API uses latitude/longitude; CorridorMap uses lat/lng — normalize here.
	const mapSections: CorridorMapSection[] = useMemo(() => {
		if (!USE_MAP_TILES || !assembly) return [];
		// Build a lookup from the assembly's section ranges for authoritative mile values.
		const rangeById = new Map<string, { startMile: number; endMile: number }>();
		for (const r of assembly.sectionRanges) {
			rangeById.set(r.sectionId, { startMile: r.startMile, endMile: r.endMile });
		}
		return sections
			.filter((s: any) => !s.parentSectionId)  // top-level only for path rendering
			.map((s: any): CorridorMapSection => {
				// Prefer AP-derived corridorMileSpan (authoritative); fall back to
				// assembly geometry-based ranges, then 0.
				const span = s.corridorMileSpan;
				const apMileRange = (span && Number.isFinite(span.startMile) && Number.isFinite(span.endMile))
					? { startMile: span.startMile, endMile: span.endMile }
					: null;
				const fallback = rangeById.get(s.id);
				const range = apMileRange ?? fallback ?? { startMile: 0, endMile: 0 };
				return {
					id: s.id,
					name: s.name,
					status: s.status ?? 'unknown',
					startMile: range.startMile,
					endMile: range.endMile,
					parentSectionId: s.parentSectionId ?? null,
				};
			});
	}, [USE_MAP_TILES, sections, assembly]);

	const mapAccessPoints: CorridorMapAccessPoint[] = useMemo(() => {
		if (!USE_MAP_TILES) return [];
		return accessPoints
			.filter((ap: any) => ap.latitude != null && ap.longitude != null)
			.map((ap: any): CorridorMapAccessPoint => ({
				id: ap.id,
				name: ap.name,
				kind: ap.kind,
				lng: ap.longitude as number,
				lat: ap.latitude as number,
				riverMile: ap.riverMile ?? null,
			}));
	}, [USE_MAP_TILES, accessPoints]);

	const mapDams: CorridorMapDam[] = useMemo(() => {
		if (!USE_MAP_TILES) return [];
		return dams
			.filter((d: any) => d.latitude != null && d.longitude != null)
			.map((d: any): CorridorMapDam => ({
				id: d.id,
				name: d.name,
				lng: d.longitude as number,
				lat: d.latitude as number,
				riverMile: d.riverMile ?? null,
			}));
	}, [USE_MAP_TILES, dams]);

	const GAUGE_OFFSETS: Record<string, { dx: number; dy: number }> = {
		'usgs-07086000': { dx: -90, dy: -30 },  // Granite — push up-left
		'usgs-07091200': { dx: -90, dy: -10 },  // Nathrop / Salida — push left
		'usgs-07094500': { dx: 80,  dy: -30 },  // Parkdale — push up-right
		'usgs-07087050': { dx: -90, dy: -30 },  // below Granite — push up-left
		'usgs-07096000': { dx: 80,  dy: 20 },   // Cañon City — push down-right
	};

	const mapGauges: CorridorMapGauge[] = useMemo(() => {
		if (!USE_MAP_TILES) return [];
		// Build a flat list of top-level sections with their mile spans for gauge lookup.
		const topSections = sections.filter((s: any) => !s.parentSectionId);
		return gauges
			.filter((g: any) => g.latitude != null && g.longitude != null && g.currentFlow != null)
			.map((g: any): CorridorMapGauge => {
				const rm: number | null = g.riverMile ?? null;
				// Find the section whose corridorMileSpan contains this gauge's river mile.
				const containingSection = rm != null
					? topSections.find((s: any) => {
						const span = s.corridorMileSpan;
						return span && span.startMile != null && span.endMile != null
							&& rm >= span.startMile && rm <= span.endMile;
					})
					: null;
				const flowBands = containingSection
					? {
						idealMax: containingSection.flowIdealMax ?? 0,
						idealMin: containingSection.flowIdealMin ?? 0,
						low: containingSection.flowLow ?? 0,
						runnable: containingSection.flowRunnable ?? 0,
						high: containingSection.flowHigh ?? 0,
						expert: containingSection.flowExpert ?? 0,
						dangerous: containingSection.flowDangerous ?? 0,
					}
					: null;
				return {
					id: g.id,
					name: g.name,
					lng: g.longitude as number,
					lat: g.latitude as number,
					riverMile: rm,
					currentFlow: g.currentFlow ?? null,
					unit: g.unit ?? 'cfs',
					flowBands,
					offset: GAUGE_OFFSETS[g.id as string] ?? { dx: -90, dy: -30 },
				};
			});
	}, [USE_MAP_TILES, gauges, sections]);

	// Scroll-driven header interpolation.
	// AppHeader is position:sticky top:0 height:64 — H1 sticks at top:64.
	const breadcrumbOpacity = Math.max(0, 1 - scrollY / 80);
	const breadcrumbMaxHeight = breadcrumbOpacity > 0 ? 40 : 0;
	const descOpacity = Math.max(0, 1 - (scrollY - 40) / 80);
	const descMaxHeight = descOpacity > 0 ? 80 : 0;
	const h1FontSize = 32 - Math.min(16, scrollY / 150 * 16);  // 32px → 16px by scrollY 150

	// Read initial expanded section from URL ?section= param.
	const initialExpandedId = searchParams.get('section') ?? null;

	const handleExpandedChange = (id: string | null) => {
		if (id) {
			setSearchParams({ section: id }, { replace: true });
		} else {
			setSearchParams({}, { replace: true });
		}
	};

	return (
		<div style={{ width: '100%', minHeight: 880, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: 'var(--ink-1)' }}>
			<AppHeader activePage="rivers" />

			{/* Scroll-driven breadcrumb — fades out by scrollY 80 */}
			<div style={{
				padding: '20px 28px 0',
				overflow: 'hidden',
				maxHeight: breadcrumbMaxHeight,
				opacity: breadcrumbOpacity,
				transition: 'opacity 0.15s ease, max-height 0.2s ease',
			}}>
				<Breadcrumb segments={breadcrumb} />
			</div>

			{/* Sticky H1 — shrinks from 32px to 16px, sticks below AppHeader */}
			<h1 style={{
				position: 'sticky',
				top: 64,
				zIndex: 10,
				margin: 0,
				padding: '8px 28px 6px',
				background: 'var(--bg-app)',
				fontSize: h1FontSize,
				fontWeight: 700,
				letterSpacing: '-0.025em',
				color: 'var(--ink-0)',
				transition: 'font-size 0.05s linear',
			}}>
				{isLoading ? <Skeleton width={320} height={32} /> : (corridor?.name || slug)}
			</h1>

			{/* Scroll-driven description — fades out after scrollY 40 */}
			{corridor?.description && (
				<div style={{
					padding: '0 28px',
					overflow: 'hidden',
					maxHeight: descMaxHeight,
					opacity: descOpacity,
					transition: 'opacity 0.15s ease, max-height 0.2s ease',
				}}>
					<p style={{ margin: '0 0 12px', maxWidth: 720, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
						{corridor.description}
					</p>
				</div>
			)}

			{isLoading && (
				<div style={{ padding: '12px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 1000 }}>
					{[1, 2, 3].map(i => <Skeleton key={i} height={72} borderRadius="var(--r-lg)" />)}
				</div>
			)}

			{!isLoading && sections.length === 0 && (
				<div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
					No sections in this corridor yet.
				</div>
			)}

			{!isLoading && sections.length > 0 && hasAnyGeometry && (
				<div style={{
					padding: USE_MAP_TILES ? '12px 28px 96px' : '12px 28px 96px',
					maxWidth: USE_MAP_TILES ? '100%' : 1200,
				}}>
					{USE_MAP_TILES ? (
						<CorridorMapColumn
							corridorId={corridor?.id || slug}
							corridorPolyline={corridorPolyline}
							targetRiverName="Arkansas River"
							sections={sections}
							accessPoints={accessPoints}
							dams={dams}
							gauges={gauges}
							sectionsForMap={mapSections}
							accessPointsForMap={mapAccessPoints}
							damsForMap={mapDams}
							gaugesForMap={mapGauges}
							initialExpandedId={initialExpandedId}
							onExpandedChange={handleExpandedChange}
						/>
					) : (
						<div style={{
							display: 'grid',
							gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)',
							gap: 24,
							alignItems: 'flex-start',
						}}>
							<CorridorSpineColumn
								corridorId={corridor?.id || slug}
								sections={sections}
								accessPoints={accessPoints}
								gauges={gauges}
								dams={dams}
								onActiveSectionChange={setActiveSectionId}
							/>
							<CorridorSpineDetailPane
								sections={sections}
								accessPoints={accessPoints}
								dams={dams}
								gauges={gauges}
								activeSectionId={activeSectionId}
								density="desktop"
							/>
						</div>
					)}
				</div>
			)}

			{!isLoading && sections.length > 0 && !hasAnyGeometry && (
				<div style={{ padding: '12px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 1000 }}>
					<div style={{ ...eyebrow, marginBottom: 4 }}>
						Sections · upstream → downstream
					</div>
					{sections.map((s: any) => <SectionRow key={s.id} section={s} density="desktop" />)}
				</div>
			)}
		</div>
	);
}
