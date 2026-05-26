import { useState, useMemo } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useCorridorTiles } from '../hooks/useCorridorTiles';
import { AppHeader } from '../components/AppHeader';
import { Skeleton } from '../components/Skeleton';
import { WatershedGroupHeader } from '../components/WatershedGroupHeader';
import { CraftSkillControl } from '../components/CraftSkillControl';
import { SummaryStat } from './SummaryStat';
import { HomeCorridorSpineTile } from '../components/HomeCorridorSpineTile';
import { SearchHero } from '../components/SearchHero';
import { useScrollProgress, lerpStyle } from '../hooks/useStuck';
import { mapStatusToDesign } from '../constants';

type DashboardFilter = 'all' | 'running' | 'ideal' | 'rising' | 'low';

export function DesktopShell() {
	const { data, isLoading, error } = useDashboard();
	const { data: tilesData, isLoading: tilesLoading } = useCorridorTiles();
	const [filter, setFilter] = useState<DashboardFilter>('all');
	const { ref: titleRef, progress: titleProgress } = useScrollProgress<HTMLDivElement>(64, 140);

	const sections = data?.sections || [];
	const tiles = useMemo(() => tilesData?.tiles || [], [tilesData]);
	const [collapsedWatersheds, setCollapsedWatersheds] = useState<Set<string>>(new Set());

	const tileMatchesFilter = (tile: typeof tiles[number], f: DashboardFilter): boolean => {
		if (f === 'all') return true;
		if (f === 'rising') return tile.gauges.some(g => g.trend === 'up');
		return tile.legs.some(l => {
			const ds = mapStatusToDesign(l.status);
			if (f === 'running') return ds === 'ideal' || ds === 'runnable' || ds === 'high';
			if (f === 'ideal') return ds === 'ideal';
			if (f === 'low') return ds === 'low';
			return false;
		});
	};

	const filteredTiles = useMemo(() => tiles.filter(t => tileMatchesFilter(t, filter)), [tiles, filter]);

	const watershedOrder = useMemo(() => {
		const seen = new Map<string, string>();
		for (const t of filteredTiles) {
			const slug = t.watershedId || '_unassigned';
			if (!seen.has(slug)) seen.set(slug, t.watershedName || 'Other');
		}
		return Array.from(seen.entries())
			.sort(([, aName], [, bName]) => aName.localeCompare(bName));
	}, [filteredTiles]);

	const groupedTilesByWatershed = useMemo(() => {
		const m: Record<string, typeof tiles> = {};
		for (const t of filteredTiles) {
			const slug = t.watershedId || '_unassigned';
			if (!m[slug]) m[slug] = [];
			m[slug].push(t);
		}
		for (const slug of Object.keys(m)) {
			m[slug] = m[slug].slice().sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999));
		}
		return m;
	}, [filteredTiles]);

	const toggleWatershed = (slug: string) => {
		setCollapsedWatersheds(prev => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	};

	const totalCount = sections.length;
	const runningCount = sections.filter(s => s.status === 'ideal' || s.status === 'runnable' || s.status === 'high').length;
	const idealCount = sections.filter(s => s.status === 'ideal').length;
	const risingCount = sections.filter(s => s.trend === 'up').length;
	const lowCount = sections.filter(s => s.status === 'low').length;

	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

	if (error) {
		return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--danger-solid)' }}>Failed to load dashboard. Is the server running?</div>;
	}
	if (!isLoading && !sections.length) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
				<div style={{ fontSize: 16, color: 'var(--ink-2)' }}>No data yet.</div>
				<div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Seed the database and run ingestion from the <a href="/admin" style={{ color: 'var(--river-600)', textDecoration: 'underline' }}>Admin page</a>.</div>
			</div>
		);
	}

	return (
		<div style={{
			width: '100%', minHeight: '100vh',
			background: 'var(--bg-app)',
			fontFamily: 'var(--font-sans)',
			color: 'var(--ink-1)',
		}}>
			<AppHeader activePage="rivers" />

			{/* Hero — image + glass search box, Colorado-first global search */}
			<SearchHero />

			{/* Page heading + controls — sticky below the AppHeader. The title
			    scales smoothly with scroll instead of swapping between two
			    layouts (which used to oscillate because the size change moved
			    the sentinel). Font family, weight, and case are constant; only
			    size, padding, and the divider tint change with progress. */}
			<div
				ref={titleRef}
				style={{
					position: 'sticky',
					top: 64,
					zIndex: 20,
					background: `rgba(255,255,255,${lerpStyle(0, 0.92, titleProgress)})`,
					backdropFilter: titleProgress > 0.05 ? 'blur(12px) saturate(180%)' : 'none',
					WebkitBackdropFilter: titleProgress > 0.05 ? 'blur(12px) saturate(180%)' : 'none',
					borderBottom: `1px solid rgba(0,0,0,${lerpStyle(0, 0.08, titleProgress)})`,
					paddingTop: lerpStyle(24, 10, titleProgress),
					paddingBottom: lerpStyle(16, 10, titleProgress),
					paddingLeft: 28,
					paddingRight: 28,
				}}
			>
				<h1 style={{
					margin: `0 0 ${lerpStyle(16, 8, titleProgress)}px`,
					fontFamily: 'var(--font-sans)',
					fontSize: lerpStyle(32, 16, titleProgress),
					fontWeight: 700,
					letterSpacing: '-0.025em',
					color: 'var(--ink-0)',
					lineHeight: 1.15,
				}}>
					Colorado · {dateStr}
				</h1>
				<div style={{
					display: 'flex', alignItems: 'stretch',
					justifyContent: 'space-between',
					gap: 20, flexWrap: 'wrap',
				}}>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						{isLoading ? (
							<>{[1,2,3,4,5].map(i => <Skeleton key={i} width={96} height={80} borderRadius="var(--r-lg)" />)}</>
						) : (
							<>
								<SummaryStat label="All"     value={totalCount}   progress={titleProgress} active={filter === 'all'}     onClick={() => setFilter('all')} />
								<SummaryStat label="Running" value={runningCount} progress={titleProgress} active={filter === 'running'} onClick={() => setFilter('running')} />
								<SummaryStat label="Ideal"   value={idealCount}   progress={titleProgress} color="var(--ideal-solid)" active={filter === 'ideal'}   onClick={() => setFilter('ideal')} />
								<SummaryStat label="Rising"  value={risingCount}  progress={titleProgress} color="var(--trend-up)"     trendIcon="up" active={filter === 'rising'}  onClick={() => setFilter('rising')} />
								<SummaryStat label="Low"     value={lowCount}     progress={titleProgress} color="var(--low-solid)"    active={filter === 'low'}     onClick={() => setFilter('low')} />
							</>
						)}
					</div>
					<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'stretch' }}>
						<CraftSkillControl variant="desktop" layout="stacked" collapseProgress={titleProgress} />
					</div>
				</div>
			</div>

			{/* Stacked corridor tiles — each tile is an integrated card with the
			    river spine on the left and active-section detail on the right.
			    Watershed group headers separate runs by basin. */}
			<div style={{
				display: 'flex', flexDirection: 'column', gap: 28,
				padding: '20px 28px 96px',
				maxWidth: 1180, margin: '0 auto', width: '100%',
			}}>
				{tilesLoading || isLoading ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
						{[1,2,3].map(i => <Skeleton key={i} height={520} borderRadius="var(--r-xl)" />)}
					</div>
				) : (
					watershedOrder.map(([slug, name]) => {
						const items = groupedTilesByWatershed[slug];
						if (!items || items.length === 0) return null;
						const collapsed = collapsedWatersheds.has(slug);
						return (
							<section key={slug} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
								<WatershedGroupHeader
									slug={slug}
									name={name}
									count={items.reduce((s, t) => s + t.legs.length, 0)}
									collapsed={collapsed}
									onToggle={() => toggleWatershed(slug)}
								/>
								{!collapsed && (
									<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
										{items.map(t => (
											<HomeCorridorSpineTile key={t.corridorId} tile={t as any} density="desktop" />
										))}
									</div>
								)}
							</section>
						);
					})
				)}
				{!isLoading && filteredTiles.length === 0 && (
					<div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-3)' }}>
						No corridors match the current filter.
					</div>
				)}
			</div>
		</div>
	);
}
