import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { STATUS_ORDER, STATUS_LABEL, type DesignStatus } from '../constants';
import { useDashboard } from '../hooks/useDashboard';
import { AppHeader } from '../components/AppHeader';
import { Skeleton } from '../components/Skeleton';
import { StatusGroupHeader, type SparkRange } from '../components/StatusGroupHeader';
import { SummaryStat } from './SummaryStat';
import { DesktopFilter } from './DesktopFilter';
import { DesktopRiverRow } from './DesktopRiverRow';
import { DesktopDetail } from './DesktopDetail';

export function DesktopShell() {
	const { sectionId: urlSectionId } = useParams<{ sectionId?: string }>();
	const navigate = useNavigate();
	const { data, isLoading, error } = useDashboard();
	const [filter, setFilter] = useState<'all' | DesignStatus>('all');
	const [selectedId, setSelectedId] = useState<string | null>(urlSectionId || null);
	const [sparkDays, setSparkDays] = useState<SparkRange>(14);

	const sections = data?.sections || [];

	useEffect(() => {
		if (urlSectionId) setSelectedId(urlSectionId);
	}, [urlSectionId]);

	useEffect(() => {
		if (!selectedId && sections.length > 0) {
			setSelectedId(sections[0].id);
		}
	}, [sections, selectedId]);

	const filtered = useMemo(() => {
		return filter === 'all' ? sections : sections.filter(s => s.status === filter);
	}, [sections, filter]);

	const grouped = useMemo(() => {
		const byStatus: Record<string, typeof sections> = {};
		for (const s of STATUS_ORDER) byStatus[s] = [];
		for (const s of filtered) {
			if (byStatus[s.status]) byStatus[s.status].push(s);
		}
		return byStatus;
	}, [filtered]);

	const handleSelect = (id: string) => {
		setSelectedId(id);
		navigate(`/section/${id}`, { replace: true });
	};

	const totalRunnable = sections.filter(s => s.status === 'ideal' || s.status === 'runnable' || s.status === 'high').length;
	const idealCount = sections.filter(s => s.status === 'ideal').length;
	const risingCount = sections.filter(s => s.trend === 'up').length;
	const fallingCount = sections.filter(s => s.trend === 'down').length;

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

			{/* Page heading */}
			<div style={{
				padding: '24px 28px 16px', display: 'flex',
				alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
			}}>
				<div>
					<div style={{
						fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
						letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
					}}>
						<span style={{ color: 'var(--ink-4)' }}>{'// '}</span>
						Colorado · {dateStr}
					</div>
					<h1 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
						Rivers running today
					</h1>
				</div>
				<div style={{ display: 'flex', gap: 8 }}>
					{isLoading ? (
						<>{[1,2,3,4].map(i => <Skeleton key={i} width={110} height={70} borderRadius="var(--r-lg)" />)}</>
					) : (
						<>
							<SummaryStat label="Running" value={totalRunnable} sub={`of ${sections.length} tracked`} />
							<SummaryStat label="Ideal" value={idealCount} color="var(--ideal-solid)" sub="sweet spot" />
							<SummaryStat label="Rising" value={risingCount} color="var(--trend-up)" sub="last 24h" trendIcon="up" />
							<SummaryStat label="Falling" value={fallingCount} color="var(--trend-down)" sub="last 24h" trendIcon="down" />
						</>
					)}
				</div>
			</div>

			{/* Filter strip */}
			<div style={{ padding: '0 28px 16px', display: 'flex', gap: 8 }}>
				{isLoading ? (
					<>{[90, 70, 80, 55].map((w, i) => <Skeleton key={i} width={w} height={36} borderRadius="var(--r-pill)" />)}</>
				) : (
					<>
						<DesktopFilter label="All sections" count={sections.length} active={filter === 'all'} onClick={() => setFilter('all')} />
						{STATUS_ORDER.map(s => {
							const n = sections.filter(r => r.status === s).length;
							if (n === 0) return null;
							return <DesktopFilter key={s} label={STATUS_LABEL[s]} count={n} status={s} active={filter === s} onClick={() => setFilter(s)} />;
						})}
					</>
				)}
			</div>

			{/* Main split: sidebar + detail */}
			<div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: 20, padding: '0 28px 28px', flex: 1, minHeight: 0 }}>
				<aside style={{ display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', paddingRight: 4 }}>
					{isLoading ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{[1,2,3,4,5,6].map(i => <Skeleton key={i} height={88} borderRadius="var(--r-lg)" />)}
						</div>
					) : (
						(() => {
							let isFirst = true;
							return STATUS_ORDER.map(status => {
								const items = grouped[status];
								if (!items || items.length === 0) return null;
								const showSelector = isFirst;
								isFirst = false;
								return (
									<section key={status}>
										<StatusGroupHeader status={status} count={items.length}
											{...(showSelector ? { sparkRange: sparkDays, onSparkRangeChange: setSparkDays } : {})}
										/>
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
