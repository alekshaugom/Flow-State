import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { AppHeader } from '../components/AppHeader';
import { Skeleton } from '../components/Skeleton';
import { WatershedGroupHeader, type SparkRange } from '../components/WatershedGroupHeader';
import { CraftSkillControl } from '../components/CraftSkillControl';
import { SummaryStat } from './SummaryStat';
import { DesktopRiverRow } from './DesktopRiverRow';
import { DesktopDetail } from './DesktopDetail';
import { SearchHero } from '../components/SearchHero';

type DashboardFilter = 'all' | 'running' | 'ideal' | 'rising' | 'low';

function matchesFilter(s: any, filter: DashboardFilter): boolean {
	switch (filter) {
		case 'all': return true;
		case 'running': return s.status === 'ideal' || s.status === 'runnable' || s.status === 'high';
		case 'ideal': return s.status === 'ideal';
		case 'rising': return s.trend === 'up';
		case 'low': return s.status === 'low';
	}
}

export function DesktopShell() {
	const { sectionId: urlSectionId } = useParams<{ sectionId?: string }>();
	const navigate = useNavigate();
	const { data, isLoading, error } = useDashboard();
	const [filter, setFilter] = useState<DashboardFilter>('all');
	const [selectedId, setSelectedId] = useState<string | null>(urlSectionId || null);
	const [sparkDays, setSparkDays] = useState<SparkRange>(14);

	const sections = data?.sections || [];
	const [collapsedWatersheds, setCollapsedWatersheds] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (urlSectionId) setSelectedId(urlSectionId);
	}, [urlSectionId]);

	useEffect(() => {
		if (!selectedId && sections.length > 0) {
			setSelectedId(sections[0].id);
		}
	}, [sections, selectedId]);

	const filtered = useMemo(() => {
		if (filter === 'all') return sections;
		return sections.filter(s => matchesFilter(s, filter));
	}, [sections, filter]);

	const watershedOrder = useMemo(() => {
		const seen = new Map<string, string>();
		for (const s of filtered) {
			const slug = s.watershedSlug || '_unassigned';
			if (!seen.has(slug)) seen.set(slug, s.watershedName || 'Other');
		}
		return Array.from(seen.entries())
			.sort(([, aName], [, bName]) => aName.localeCompare(bName));
	}, [filtered]);

	const groupedByWatershed = useMemo(() => {
		const m: Record<string, typeof sections> = {};
		for (const s of filtered) {
			const slug = s.watershedSlug || '_unassigned';
			if (!m[slug]) m[slug] = [];
			m[slug].push(s);
		}
		// Within each watershed, sort upstream→downstream by corridor then section
		// sortIndex (same order as the watershed/corridor pages).
		for (const slug of Object.keys(m)) {
			m[slug] = m[slug].slice().sort((a, b) => {
				const ai = a.corridorSortIndex ?? 999;
				const bi = b.corridorSortIndex ?? 999;
				if (ai !== bi) return ai - bi;
				return (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
			});
		}
		return m;
	}, [filtered]);

	const toggleWatershed = (slug: string) => {
		setCollapsedWatersheds(prev => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	};

	const handleSelect = (id: string) => {
		setSelectedId(id);
		navigate(`/section/${id}`, { replace: true });
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
			width: '100%', height: '100%', minHeight: 880,
			background: 'var(--bg-app)',
			display: 'flex', flexDirection: 'column',
			fontFamily: 'var(--font-sans)',
			color: 'var(--ink-1)',
		}}>
			<AppHeader activePage="rivers" />

			{/* Hero — image + glass search box, Colorado-first global search */}
			<SearchHero />

			{/* Page heading */}
			<div style={{
				padding: '24px 28px 16px', display: 'flex',
				alignItems: 'flex-end', justifyContent: 'space-between',
				gap: 20, flexWrap: 'wrap',
			}}>
				<div style={{ minWidth: 0 }}>
					<div style={{
						fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
						letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
					}}>
						Colorado · {dateStr}
					</div>
					<h1 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
						Rivers running today
					</h1>
				</div>
				<div style={{
					display: 'flex', alignItems: 'flex-end',
					gap: 16, flexWrap: 'wrap',
				}}>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						{isLoading ? (
							<>{[1,2,3,4,5].map(i => <Skeleton key={i} width={96} height={70} borderRadius="var(--r-lg)" />)}</>
						) : (
							<>
								<SummaryStat label="All"     value={totalCount}   active={filter === 'all'}     onClick={() => setFilter('all')} />
								<SummaryStat label="Running" value={runningCount} active={filter === 'running'} onClick={() => setFilter('running')} />
								<SummaryStat label="Ideal"   value={idealCount}   color="var(--ideal-solid)" active={filter === 'ideal'}   onClick={() => setFilter('ideal')} />
								<SummaryStat label="Rising"  value={risingCount}  color="var(--trend-up)"     trendIcon="up" active={filter === 'rising'}  onClick={() => setFilter('rising')} />
								<SummaryStat label="Low"     value={lowCount}     color="var(--low-solid)"    active={filter === 'low'}     onClick={() => setFilter('low')} />
							</>
						)}
					</div>
					<CraftSkillControl variant="desktop" />
				</div>
			</div>

			{/* Main split: sidebar + detail */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'minmax(320px, 440px) minmax(0, 1fr)',
				gap: 20, padding: '0 28px 28px', flex: 1, minHeight: 0,
			}}>
				<aside style={{ display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', paddingRight: 4, minWidth: 0 }}>
					{isLoading ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{[1,2,3,4,5,6].map(i => <Skeleton key={i} height={88} borderRadius="var(--r-lg)" />)}
						</div>
					) : (
						(() => {
							let isFirst = true;
							return watershedOrder.map(([slug, name]) => {
								const items = groupedByWatershed[slug];
								if (!items || items.length === 0) return null;
								const showSelector = isFirst;
								isFirst = false;
								const collapsed = collapsedWatersheds.has(slug);
								return (
									<section key={slug}>
										<WatershedGroupHeader
											slug={slug}
											name={name}
											count={items.length}
											collapsed={collapsed}
											onToggle={() => toggleWatershed(slug)}
											{...(showSelector ? { sparkRange: sparkDays, onSparkRangeChange: setSparkDays } : {})}
										/>
										{!collapsed && (
											<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
												{items.map(s => (
													<DesktopRiverRow
														key={s.id}
														section={s}
														selected={s.id === selectedId}
														onClick={() => handleSelect(s.id)}
														sparkDays={sparkDays}
													/>
												))}
											</div>
										)}
									</section>
								);
							});
						})()
					)}
				</aside>

				<main style={{
					background: 'var(--bg-card)', border: '1px solid var(--rule)',
					borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-card)',
					overflow: 'auto', padding: 28,
					minWidth: 0,
				}}>
					{isLoading ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							<Skeleton width="60%" height={24} />
							<Skeleton width="40%" height={14} />
							<Skeleton height={200} borderRadius="var(--r-lg)" style={{ marginTop: 8 }} />
							<div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
								<Skeleton width="30%" height={60} borderRadius="var(--r-lg)" />
								<Skeleton width="30%" height={60} borderRadius="var(--r-lg)" />
								<Skeleton width="30%" height={60} borderRadius="var(--r-lg)" />
							</div>
						</div>
					) : selectedId ? (
						<DesktopDetail sectionId={selectedId} />
					) : (
						<div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
							Select a section from the sidebar
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
