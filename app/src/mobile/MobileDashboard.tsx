import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { WatershedGroupHeader, type SparkRange } from '../components/WatershedGroupHeader';
import { CraftSkillControl } from '../components/CraftSkillControl';
import { RiverCard } from './RiverCard';
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

const iconBtn: React.CSSProperties = {
	width: 36, height: 36, borderRadius: 'var(--r-pill)',
	background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
	display: 'flex', alignItems: 'center', justifyContent: 'center',
	border: '1px solid rgba(255,255,255,0.16)',
};

export function MobileDashboard() {
	const navigate = useNavigate();
	const { data, isLoading, error } = useDashboard();
	const auth = useAuth();
	const [filter, setFilter] = useState<DashboardFilter>('all');
	const [sparkDays, setSparkDays] = useState<SparkRange>(14);

	const sections = data?.sections || [];
	const [collapsedWatersheds, setCollapsedWatersheds] = useState<Set<string>>(new Set());

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

	const totalCount = sections.length;
	const runningCount = sections.filter(s => s.status === 'ideal' || s.status === 'runnable' || s.status === 'high').length;
	const idealCount = sections.filter(s => s.status === 'ideal').length;
	const risingCount = sections.filter(s => s.trend === 'up').length;
	const lowCount = sections.filter(s => s.status === 'low').length;

	const tiles: Array<{ key: DashboardFilter; label: string; value: number; valueColor?: string; trendIcon?: 'up' | 'down' }> = [
		{ key: 'all',     label: 'All',     value: totalCount },
		{ key: 'running', label: 'Running', value: runningCount },
		{ key: 'ideal',   label: 'Ideal',   value: idealCount,  valueColor: 'var(--ideal-line)' },
		{ key: 'rising',  label: 'Rising',  value: risingCount, valueColor: '#ffd58a', trendIcon: 'up' },
		{ key: 'low',     label: 'Low',     value: lowCount,    valueColor: '#ffd58a' },
	];

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
						{auth.isAuthenticated && (
							<button style={iconBtn} onClick={() => navigate('/logs')} aria-label="My Logs">
								<Icon name="star" size={18} color="white" />
							</button>
						)}
						<button style={iconBtn} onClick={() => navigate('/login')}><Icon name="user" size={18} color="white" /></button>
					</div>
				</div>
				<div style={{
					display: 'flex', gap: 6, marginTop: 14, position: 'relative',
					overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
				}}>
					{isLoading ? (
						<>{[1,2,3,4,5].map(i => <Skeleton key={i} height={56} width={68} borderRadius="var(--r-md)" style={{ background: 'rgba(255,255,255,0.08)' }} />)}</>
					) : (
						tiles.map(t => (
							<MobileTile
								key={t.key}
								label={t.label}
								value={t.value}
								valueColor={t.valueColor}
								trendIcon={t.trendIcon}
								active={filter === t.key}
								onClick={() => setFilter(t.key)}
							/>
						))
					)}
				</div>
				<div style={{ marginTop: 10, position: 'relative', display: 'flex', justifyContent: 'flex-start' }}>
					<CraftSkillControl variant="mobile" />
				</div>
			</header>

			{/* Hero — image + glass search box */}
			<SearchHero />

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

interface MobileTileProps {
	label: string;
	value: number;
	valueColor?: string;
	trendIcon?: 'up' | 'down';
	active: boolean;
	onClick: () => void;
}

function MobileTile({ label, value, valueColor, trendIcon, active, onClick }: MobileTileProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			style={{
				flex: '0 0 auto',
				minWidth: 64,
				padding: '10px 12px',
				borderRadius: 'var(--r-md)',
				background: active ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.08)',
				border: active ? '1px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.14)',
				color: active ? 'var(--river-800)' : 'white',
				display: 'flex',
				flexDirection: 'column',
				gap: 2,
				alignItems: 'flex-start',
				cursor: 'pointer',
				transition: 'background 120ms, border-color 120ms, color 120ms',
				fontFamily: 'var(--font-sans)',
			}}
		>
			<span style={{
				fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
				color: active ? 'var(--river-700)' : 'rgba(255,255,255,0.7)',
				fontFamily: 'var(--font-mono)', fontWeight: 600,
			}}>{label}</span>
			<span style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em',
				color: active ? 'var(--river-800)' : (valueColor || 'white'),
				lineHeight: 1,
			}}>{value}{trendIcon === 'up' ? '↑' : trendIcon === 'down' ? '↓' : ''}</span>
		</button>
	);
}
