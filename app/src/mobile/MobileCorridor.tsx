import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCorridor } from '../hooks/useCorridor';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';
import { CorridorSpineColumn } from '../components/CorridorSpineColumn';
import { CorridorSpineDetailPane } from '../components/CorridorSpineDetailPane';
import { type CorridorMapSection, type CorridorMapAccessPoint, type CorridorMapDam, type CorridorMapGauge } from '../components/CorridorMap';
import { CorridorMapColumn } from '../components/CorridorMapColumn';
import { RIVER_GEOMETRIES } from '../lib/river-geometries.ts';
import { assembleCorridorPolyline, type SectionForAssembly } from '../lib/corridor-assembly-pure.ts';

interface MobileCorridorProps {
	slug: string;
}

export function MobileCorridor({ slug }: MobileCorridorProps) {
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
		return <div style={{ padding: 24, color: 'var(--danger-solid)' }}>Failed to load corridor.</div>;
	}

	const corridor = data?.corridor;
	const sections: any[] = data?.sections || [];
	const accessPoints: any[] = data?.accessPoints || [];
	const gauges: any[] = data?.gauges || [];
	const dams: any[] = data?.impassableDams || [];
	const breadcrumb = data?.breadcrumb || [];

	useEffect(() => {
		if (activeSectionId === null && sections.length > 0) {
			const firstTop = sections.find((s: any) => !s.parentSectionId);
			if (firstTop) setActiveSectionId(firstTop.id);
		}
	}, [sections, activeSectionId]);

	const hasAnyGeometry = useMemo(() => {
		return sections.some((s: any) => !s.parentSectionId && RIVER_GEOMETRIES[s.id]?.length);
	}, [sections]);

	// For the map-tiles path: assemble the corridor polyline from section geometries.
	const { corridorPolyline, assembly } = useMemo(() => {
		if (!USE_MAP_TILES) return { corridorPolyline: [] as Array<[number, number, number]>, assembly: null };
		const sectionShapes: SectionForAssembly[] = sections.map((s: any) => ({
			id: s.id,
			sortIndex: s.sortIndex ?? 0,
			parentSectionId: s.parentSectionId ?? null,
			lengthMiles: s.lengthMiles ?? null,
		}));
		const asm = assembleCorridorPolyline(sectionShapes, RIVER_GEOMETRIES);
		const poly: Array<[number, number, number]> = asm.polyline.map(
			(pt, i) => [pt[0], pt[1], asm.cumulativeMiles[i] ?? 0],
		);
		return { corridorPolyline: poly, assembly: asm };
	}, [USE_MAP_TILES, sections]);

	const mapSections: CorridorMapSection[] = useMemo(() => {
		if (!USE_MAP_TILES || !assembly) return [];
		const rangeById = new Map<string, { startMile: number; endMile: number }>();
		for (const r of assembly.sectionRanges) {
			rangeById.set(r.sectionId, { startMile: r.startMile, endMile: r.endMile });
		}
		return sections
			.filter((s: any) => !s.parentSectionId)
			.map((s: any): CorridorMapSection => {
				const range = rangeById.get(s.id);
				const startMile = range?.startMile ?? s.corridorMileSpan?.startMile ?? 0;
				const endMile = range?.endMile ?? s.corridorMileSpan?.endMile ?? 0;
				return {
					id: s.id,
					name: s.name,
					status: s.status ?? 'unknown',
					startMile,
					endMile,
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

	const mapGauges: CorridorMapGauge[] = useMemo(() => {
		if (!USE_MAP_TILES) return [];
		return gauges
			.filter((g: any) => g.latitude != null && g.longitude != null && g.currentFlow != null)
			.map((g: any): CorridorMapGauge => ({
				id: g.id,
				name: g.name,
				lng: g.longitude as number,
				lat: g.latitude as number,
				riverMile: g.riverMile ?? null,
				currentFlow: g.currentFlow ?? null,
				unit: g.unit ?? 'cfs',
			}));
	}, [USE_MAP_TILES, gauges]);

	// Scroll-driven header interpolation. Mobile has no AppHeader, so H1 sticks at top:0.
	const breadcrumbOpacity = Math.max(0, 1 - scrollY / 80);
	const breadcrumbMaxHeight = breadcrumbOpacity > 0 ? 36 : 0;
	const descOpacity = Math.max(0, 1 - (scrollY - 40) / 80);
	const descMaxHeight = descOpacity > 0 ? 64 : 0;
	// Mobile H1: 24px → 14px by scrollY 150
	const h1FontSize = 24 - Math.min(10, scrollY / 150 * 10);

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
		<div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', padding: '14px 16px 64px', gap: 0, fontFamily: 'var(--font-sans)' }}>
			{/* Scroll-driven breadcrumb */}
			<div style={{
				overflow: 'hidden',
				maxHeight: breadcrumbMaxHeight,
				opacity: breadcrumbOpacity,
				transition: 'opacity 0.15s ease, max-height 0.2s ease',
				marginBottom: breadcrumbOpacity > 0 ? 8 : 0,
			}}>
				<Breadcrumb segments={breadcrumb} />
			</div>

			{/* Sticky H1 — shrinks from 24px to 14px */}
			<h1 style={{
				position: 'sticky',
				top: 0,
				zIndex: 10,
				margin: 0,
				padding: '6px 0',
				background: 'var(--bg-app)',
				fontSize: h1FontSize,
				fontWeight: 700,
				letterSpacing: '-0.02em',
				color: 'var(--ink-0)',
				transition: 'font-size 0.05s linear',
			}}>
				{isLoading ? <Skeleton width={220} height={22} /> : (corridor?.name || slug)}
			</h1>

			{/* Scroll-driven description */}
			{corridor?.description && (
				<div style={{
					overflow: 'hidden',
					maxHeight: descMaxHeight,
					opacity: descOpacity,
					transition: 'opacity 0.15s ease, max-height 0.2s ease',
					marginBottom: descOpacity > 0 ? 10 : 0,
				}}>
					<p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>
						{corridor.description}
					</p>
				</div>
			)}

			<div style={{ height: 12 }} />

			{isLoading && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{[1, 2, 3].map(i => <Skeleton key={i} height={64} borderRadius="var(--r-lg)" />)}
				</div>
			)}

			{!isLoading && sections.length === 0 && (
				<div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
					No sections in this corridor yet.
				</div>
			)}

			{!isLoading && sections.length > 0 && hasAnyGeometry && USE_MAP_TILES && (
				<CorridorMapColumn
					layout="mobile"
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
			)}

			{!isLoading && sections.length > 0 && hasAnyGeometry && !USE_MAP_TILES && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<CorridorSpineDetailPane
						sections={sections}
						accessPoints={accessPoints}
						dams={dams}
						gauges={gauges}
						activeSectionId={activeSectionId}
						density="mobile"
					/>
					<CorridorSpineColumn
						corridorId={corridor?.id || slug}
						sections={sections}
						accessPoints={accessPoints}
						gauges={gauges}
						dams={dams}
						onActiveSectionChange={setActiveSectionId}
					/>
				</div>
			)}

			{!isLoading && sections.length > 0 && !hasAnyGeometry && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{sections.map((s: any) => <SectionRow key={s.id} section={s} density="mobile" />)}
				</div>
			)}
		</div>
	);
}
