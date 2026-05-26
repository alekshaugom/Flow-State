import { useEffect, useMemo, useState } from 'react';
import { useCorridor } from '../hooks/useCorridor';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';
import { CorridorSpineColumn } from '../components/CorridorSpineColumn';
import { CorridorSpineDetailPane } from '../components/CorridorSpineDetailPane';
import { RIVER_GEOMETRIES } from '../lib/river-geometries.ts';

interface DesktopCorridorProps {
	slug: string;
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

export function DesktopCorridor({ slug }: DesktopCorridorProps) {
	const { data, isLoading, error } = useCorridor(slug);
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

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

	return (
		<div style={{ width: '100%', minHeight: 880, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: 'var(--ink-1)' }}>
			<AppHeader activePage="rivers" />

			<div style={{ padding: '20px 28px 8px' }}>
				<Breadcrumb segments={breadcrumb} />
			</div>

			<div style={{ padding: '0 28px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
				<div style={eyebrow}>
					Corridor · {corridor?.driver || 'mixed'}
				</div>
				<h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
					{isLoading ? <Skeleton width={320} height={32} /> : (corridor?.name || slug)}
				</h1>
				{corridor?.description && (
					<p style={{ margin: '4px 0 0', maxWidth: 720, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
						{corridor.description}
					</p>
				)}
			</div>

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
					display: 'grid',
					gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)',
					gap: 24,
					padding: '12px 28px 96px',
					maxWidth: 1200,
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
