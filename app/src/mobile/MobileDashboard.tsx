import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_ORDER, STATUS_LABEL, type DesignStatus } from '../constants';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { WatershedGroupHeader, type SparkRange } from '../components/WatershedGroupHeader';
import { CraftSkillControl } from '../components/CraftSkillControl';
import { FilterChip } from './FilterChip';
import { RiverCard } from './RiverCard';

const iconBtn: React.CSSProperties = {
	width: 36, height: 36, borderRadius: 'var(--r-pill)',
	background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
	display: 'flex', alignItems: 'center', justifyContent: 'center',
	border: '1px solid rgba(255,255,255,0.16)',
};
const summaryStat: React.CSSProperties = {
	flex: 1, padding: '12px 14px', borderRadius: 'var(--r-md)',
	background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
	display: 'flex', flexDirection: 'column', gap: 2, color: 'white',
};
const summaryLabel: React.CSSProperties = {
	fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
	color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)', fontWeight: 500,
};

export function MobileDashboard() {
	const navigate = useNavigate();
	const { data, isLoading, error } = useDashboard();
	const auth = useAuth();
	const [filter, setFilter] = useState<'all' | DesignStatus>('all');
	const [sparkDays, setSparkDays] = useState<SparkRange>(14);

	const sections = data?.sections || [];
	const [collapsedWatersheds, setCollapsedWatersheds] = useState<Set<string>>(new Set());

	const filtered = useMemo(() => {
		return filter === 'all' ? sections : sections.filter(s => s.status === filter);
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
		// sortIndex (matches desktop sidebar + watershed/corridor pages).
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

	const totalRunnable = sections.filter(s => s.status === 'ideal' || s.status === 'runnable' || s.status === 'high').length;
	const idealCount = sections.filter(s => s.status === 'ideal').length;
	const risingCount = sections.filter(s => s.trend === 'up').length;

	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

	if (error) {
		return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--danger-solid)' }}>Failed to load dashboard.</div>;
	}
	if (!isLoading && !sections.length) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, padding: 20 }}>
				<div style={{ fontSize: 16, color: 'var(--ink-2)' }}>No data yet.</div>
				<div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Seed the database from the <a href="/admin" style={{ color: 'var(--river-600)', textDecoration: 'underline' }}>Admin page</a>.</div>
			</div>
		);
	}

	return (
		<div style={{
			width: '100%', height: '100%',
			background: 'var(--bg-app)',
			display: 'flex', flexDirection: 'column',
			overflow: 'auto',
			paddingBottom: 32,
		}}>
			{/* Hero header */}
			<header style={{
				padding: '20px 20px 16px',
				background: 'linear-gradient(180deg, var(--river-800) 0%, var(--river-700) 70%, var(--river-600) 100%)',
				color: 'white',
				position: 'relative',
				overflow: 'hidden',
				flexShrink: 0,
			}}>
				<svg style={{ position: 'absolute', right: -40, top: 30, opacity: 0.10 }} width="260" height="180" viewBox="0 0 260 180" fill="none">
					{[0, 1, 2, 3, 4, 5].map(i => (
						<path key={i} d={`M0 ${30 + i * 24} Q 60 ${10 + i * 24}, 130 ${30 + i * 24} T 260 ${30 + i * 24}`} stroke="white" strokeWidth="1.2" fill="none" />
					))}
				</svg>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
					<div>
						<div style={{
							fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
							textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 4, fontWeight: 500,
						}}>
							<span style={{ color: 'rgba(255,255,255,0.4)' }}>{'// '}</span>
							Colorado · {dateStr}
						</div>
						<h1 style={{
							margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
							color: 'white', fontFamily: 'var(--font-sans)',
						}}>
							Flow State
						</h1>
					</div>
					<div style={{ display: 'flex', gap: 8 }}>
						<button style={iconBtn} onClick={() => navigate('/map')}><Icon name="map" size={18} color="white" /></button>
						<button style={iconBtn}><Icon name="search" size={18} color="white" /></button>
						<button style={iconBtn} onClick={() => navigate('/login')}><Icon name="user" size={18} color="white" /></button>
					</div>
				</div>
				<div style={{ display: 'flex', gap: 8, marginTop: 18, position: 'relative' }}>
					{isLoading ? (
						<>{[1,2,3].map(i => <Skeleton key={i} height={54} borderRadius="var(--r-md)" style={{ flex: 1, background: 'rgba(255,255,255,0.08)' }} />)}</>
					) : (
						<>
							<div style={summaryStat}>
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>{totalRunnable}</div>
								<div style={summaryLabel}>running</div>
							</div>
							<div style={summaryStat}>
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--ideal-line)', letterSpacing: '-0.02em' }}>
									{idealCount}
								</div>
								<div style={summaryLabel}>ideal</div>
							</div>
							<div style={summaryStat}>
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: '#ffd58a', letterSpacing: '-0.02em' }}>
									{risingCount}↑
								</div>
								<div style={summaryLabel}>rising</div>
							</div>
						</>
					)}
				</div>
				<div style={{ marginTop: 10, position: 'relative' }}>
					<CraftSkillControl variant="mobile" />
				</div>
			</header>

			{/* Filter chips */}
			<div style={{
				display: 'flex', gap: 6, padding: '14px 20px 4px',
				overflowX: 'auto', WebkitOverflowScrolling: 'touch',
				scrollbarWidth: 'none', flexShrink: 0,
			}}>
				{isLoading ? (
					<>{[60, 50, 65, 45].map((w, i) => <Skeleton key={i} width={w} height={30} borderRadius="var(--r-pill)" />)}</>
				) : (
					<>
						<FilterChip label="All" count={sections.length} active={filter === 'all'} onClick={() => setFilter('all')} />
						{STATUS_ORDER.map(s => {
							const n = sections.filter(r => r.status === s).length;
							if (n === 0) return null;
							return <FilterChip key={s} label={STATUS_LABEL[s]} count={n} status={s} active={filter === s} onClick={() => setFilter(s)} />;
						})}
					</>
				)}
			</div>

			{/* Cards grouped by watershed (upstream → downstream within each) */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '10px 16px 0' }}>
				{isLoading ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{[1,2,3,4].map(i => <Skeleton key={i} height={130} borderRadius="var(--r-lg)" />)}
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
										<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
											{items.map(s => (
												<RiverCard
													key={s.id}
													section={s}
													onClick={() => navigate(`/section/${s.id}`)}
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
			</div>

			<div style={{
				marginTop: 24, padding: '0 20px',
				fontSize: 11, color: 'var(--ink-4)', textAlign: 'center',
				fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
			}}>
				Data sourced from USGS Water Services · refreshed every 15m
			</div>
		</div>
	);
}
