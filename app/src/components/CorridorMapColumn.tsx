import { useEffect, useMemo, useState } from 'react';
import { CorridorMap, type CorridorMapSection, type CorridorMapAccessPoint, type CorridorMapDam, type CorridorMapGauge } from './CorridorMap';
import { SectionTile } from './SectionTile';
import { useActiveTile } from '../hooks/useActiveTile';

interface CorridorMapColumnProps {
	corridorId: string;
	corridorPolyline: Array<[number, number, number]>;
	targetRiverName: string;
	/** Raw sections from CorridorView response — fed into SectionTile */
	sections: any[];
	accessPoints: any[];
	dams: any[];
	gauges: any[];
	/** Normalized sections for CorridorMap (geometry-derived mile ranges) */
	sectionsForMap: CorridorMapSection[];
	accessPointsForMap: CorridorMapAccessPoint[];
	damsForMap: CorridorMapDam[];
	gaugesForMap: CorridorMapGauge[];
	/** Controls layout mode. Defaults to 'desktop' (2-col grid). */
	layout?: 'desktop' | 'mobile';
	/** Pre-select a section on mount (from URL ?section= param) */
	initialExpandedId?: string | null;
	/** Notifies parent when the expanded section changes (for URL sync) */
	onExpandedChange?: (id: string | null) => void;
}

export function CorridorMapColumn({
	corridorPolyline,
	targetRiverName,
	sections,
	sectionsForMap,
	accessPointsForMap,
	damsForMap,
	gaugesForMap,
	layout = 'desktop',
	initialExpandedId = null,
	onExpandedChange,
}: CorridorMapColumnProps) {
	// Single-tile expanded at a time.
	const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);

	// Sync initialExpandedId changes (e.g. URL loads with ?section=X).
	useEffect(() => {
		if (initialExpandedId !== undefined) {
			setExpandedId(initialExpandedId);
		}
	// Only run when the prop value changes, not on every render.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const toggleExpanded = (id: string) => {
		setExpandedId(prev => {
			const next = prev === id ? null : id;
			onExpandedChange?.(next);
			return next;
		});
	};

	// Scroll-driven active tile tracking.
	const { registerTile, activeSectionId, activeMile, scrollToTile } = useActiveTile();

	// Build a O(1) lookup from section id → mile range (from authoritative geometry-derived data).
	const mileRangeById = useMemo(() => {
		const map = new Map<string, { startMile: number; endMile: number }>();
		for (const s of sectionsForMap) {
			map.set(s.id, { startMile: s.startMile, endMile: s.endMile });
		}
		// For child sections not in sectionsForMap, fall back to corridorMileSpan.
		for (const s of sections) {
			if (!map.has(s.id) && s.corridorMileSpan) {
				map.set(s.id, {
					startMile: s.corridorMileSpan.startMile ?? 0,
					endMile: s.corridorMileSpan.endMile ?? 0,
				});
			}
		}
		return map;
	}, [sectionsForMap, sections]);

	// Build a lookup from section id → parent name for sub-section eyebrow labels.
	const parentNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of sections) {
			if (!s.parentSectionId) map.set(s.id, s.name);
		}
		const result = new Map<string, string>();
		for (const s of sections) {
			if (s.parentSectionId) {
				const parentName = map.get(s.parentSectionId);
				if (parentName) result.set(s.id, parentName);
			}
		}
		return result;
	}, [sections]);

	// Sort sections upstream→downstream by sortIndex.
	const sortedSections = useMemo(() => {
		return [...sections].sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
	}, [sections]);

	// paddingTop / paddingBottom = ~40vh so the first AND last tile's midpoints can
	// reach viewport center on scroll. Without this, the dot can't traverse to the
	// first section's start (scrollY=0 puts viewport center above the first tile) or
	// to the last section's end (page bottom reached before last tile crosses center).
	const tileStack = (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			gap: layout === 'mobile' ? 12 : 16,
			paddingTop: '40vh',
			paddingBottom: '50vh',
		}}>
			{sortedSections.map(s => {
				const range = mileRangeById.get(s.id);
				const startMile = range?.startMile ?? 0;
				const endMile = range?.endMile ?? 0;
				const parentSectionName = parentNameById.get(s.id) ?? null;

				return (
					<SectionTile
						key={s.id}
						section={{ ...s, parentSectionName }}
						expanded={expandedId === s.id}
						onToggle={() => toggleExpanded(s.id)}
						tileRefCallback={registerTile(s.id, startMile, endMile)}
						isActive={s.id === activeSectionId}
					/>
				);
			})}
		</div>
	);

	if (layout === 'mobile') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
				{/* TOP: sticky map at 45vh */}
				<div style={{
					position: 'sticky',
					top: 0,
					height: '45vh',
					zIndex: 5,
					width: '100%',
				}}>
					<CorridorMap
						corridorPolyline={corridorPolyline}
						targetRiverName={targetRiverName}
						sections={sectionsForMap}
						accessPoints={accessPointsForMap}
						dams={damsForMap}
						gauges={gaugesForMap}
						activeMile={activeMile}
						activeSectionId={activeSectionId}
						focusedSectionId={expandedId}
						onSelectSection={(id) => scrollToTile(id)}
						calloutDirection="down"
						style={{ height: '100%', borderRadius: 'var(--r-lg)' }}
					/>
				</div>

				{/* BELOW: tile stack */}
				<div style={{ paddingTop: 12 }}>
					{tileStack}
				</div>
			</div>
		);
	}

	return (
		<div style={{
			display: 'grid',
			gridTemplateColumns: '1fr 1fr',
			gap: 24,
			alignItems: 'flex-start',
		}}>
			{/* LEFT: sticky map */}
			<div style={{ position: 'sticky', top: 80, height: 'calc(100vh - 112px)' }}>
				<CorridorMap
					corridorPolyline={corridorPolyline}
					targetRiverName={targetRiverName}
					sections={sectionsForMap}
					accessPoints={accessPointsForMap}
					dams={damsForMap}
					gauges={gaugesForMap}
					activeMile={activeMile}
					activeSectionId={activeSectionId}
					focusedSectionId={expandedId}
					onSelectSection={(id) => scrollToTile(id)}
					calloutDirection="right"
					style={{ height: '100%' }}
				/>
			</div>

			{/* RIGHT: scrollable tile stack */}
			{tileStack}
		</div>
	);
}
