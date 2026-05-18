import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMyLogsAggregate } from '../hooks/useMyLogsAggregate';
import { useDashboard } from '../hooks/useDashboard';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { LogFilterBar } from '../components/LogFilterBar';
import { RiverLogCard } from '../components/RiverLogCard';
import { parseConditionTags } from '../components/ConditionsTagChips';
import type {
	MyLogsAggregateResponse,
	MyLogsWatershed,
	RiverLogEntry,
	UserProfileEntry,
} from '../types';

type ViewMode = 'watershed' | 'year';

const eyebrowStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 11,
	letterSpacing: '0.12em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
};

function filterLogs(
	logs: RiverLogEntry[],
	filters: { craft: string | null; tag: string | null; watershedId: string | null },
): RiverLogEntry[] {
	return logs.filter(l => {
		if (filters.craft && l.craftType !== filters.craft) return false;
		if (filters.watershedId && l.watershedId !== filters.watershedId) return false;
		if (filters.tag) {
			const tags = parseConditionTags(l.conditionsTags);
			if (!tags.includes(filters.tag)) return false;
		}
		return true;
	});
}

function rebuildWatershedTree(
	original: MyLogsWatershed[],
	filteredLogs: RiverLogEntry[],
): MyLogsWatershed[] {
	const watershedNames = new Map(original.map(w => [w.watershedId, w.name]));
	const corridorNames = new Map<string, string>();
	const sectionNames = new Map<string, string>();
	for (const w of original) {
		for (const c of w.corridors) {
			corridorNames.set(c.corridorId, c.name);
			for (const s of c.sections) sectionNames.set(s.sectionId, s.name);
		}
	}

	const watershedAgg = new Map<string, {
		watershedId: string;
		name: string;
		tripCount: number;
		lastTripAt: string | null;
		sections: Set<string>;
		corridors: Map<string, {
			corridorId: string;
			name: string;
			tripCount: number;
			lastTripAt: string | null;
			sectionMap: Map<string, { sectionId: string; name: string; tripCount: number; lastTripAt: string | null }>;
		}>;
	}>();

	for (const log of filteredLogs) {
		const wId = log.watershedId || '__unfiled__';
		const cId = log.corridorId || '__unfiled__';
		const sId = log.sectionId || '__unfiled__';
		const tripDate = log.date || null;

		let w = watershedAgg.get(wId);
		if (!w) {
			w = {
				watershedId: wId,
				name: watershedNames.get(wId) || (wId === '__unfiled__' ? 'Other' : wId),
				tripCount: 0,
				lastTripAt: null,
				sections: new Set(),
				corridors: new Map(),
			};
			watershedAgg.set(wId, w);
		}
		w.tripCount += 1;
		w.sections.add(sId);
		if (!w.lastTripAt || (tripDate && tripDate > w.lastTripAt)) w.lastTripAt = tripDate;

		let c = w.corridors.get(cId);
		if (!c) {
			c = {
				corridorId: cId,
				name: corridorNames.get(cId) || (cId === '__unfiled__' ? 'Other' : cId),
				tripCount: 0,
				lastTripAt: null,
				sectionMap: new Map(),
			};
			w.corridors.set(cId, c);
		}
		c.tripCount += 1;
		if (!c.lastTripAt || (tripDate && tripDate > c.lastTripAt)) c.lastTripAt = tripDate;

		let s = c.sectionMap.get(sId);
		if (!s) {
			s = {
				sectionId: sId,
				name: sectionNames.get(sId) || sId,
				tripCount: 0,
				lastTripAt: null,
			};
			c.sectionMap.set(sId, s);
		}
		s.tripCount += 1;
		if (!s.lastTripAt || (tripDate && tripDate > s.lastTripAt)) s.lastTripAt = tripDate;
	}

	return Array.from(watershedAgg.values()).map(w => ({
		watershedId: w.watershedId,
		name: w.name,
		tripCount: w.tripCount,
		sectionCount: w.sections.size,
		lastTripAt: w.lastTripAt,
		corridors: Array.from(w.corridors.values()).map(c => ({
			corridorId: c.corridorId,
			name: c.name,
			tripCount: c.tripCount,
			lastTripAt: c.lastTripAt,
			sections: Array.from(c.sectionMap.values()).sort((a, b) => (b.lastTripAt || '').localeCompare(a.lastTripAt || '')),
		})).sort((a, b) => (b.lastTripAt || '').localeCompare(a.lastTripAt || '')),
	})).sort((a, b) => (b.lastTripAt || '').localeCompare(a.lastTripAt || ''));
}

export function MyLogsPage() {
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const navigate = useNavigate();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	const [search, setSearch] = useSearchParams();

	useEffect(() => {
		if (!authLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [authLoading, isAuthenticated, navigate]);

	const aggregate = useMyLogsAggregate();
	const dashboard = useDashboard();

	const view: ViewMode = (search.get('view') === 'year') ? 'year' : 'watershed';
	const craft = search.get('craft');
	const tag = search.get('tag');
	const watershedId = search.get('watershed');

	const data: MyLogsAggregateResponse | undefined = aggregate.data as any;

	const filteredLogs = useMemo<RiverLogEntry[]>(() => {
		if (!data) return [];
		return filterLogs(data.logs, { craft, tag, watershedId });
	}, [data, craft, tag, watershedId]);

	const filteredWatersheds = useMemo<MyLogsWatershed[]>(() => {
		if (!data) return [];
		return rebuildWatershedTree(data.watersheds, filteredLogs);
	}, [data, filteredLogs]);

	const filteredYearGroups = useMemo(() => {
		const yearMap = new Map<number, RiverLogEntry[]>();
		for (const log of filteredLogs) {
			const y = parseInt((log.date || '').slice(0, 4), 10);
			if (!Number.isFinite(y)) continue;
			const arr = yearMap.get(y) || [];
			arr.push(log);
			yearMap.set(y, arr);
		}
		return Array.from(yearMap.entries())
			.map(([year, logs]) => ({ year, tripCount: logs.length, logs }))
			.sort((a, b) => b.year - a.year);
	}, [filteredLogs]);

	const watershedOptions = useMemo(() => {
		const allWatersheds = (dashboard.data as any)?.watersheds || (data?.watersheds.map(w => ({ id: w.watershedId, name: w.name })) || []);
		return allWatersheds.map((w: any) => ({ id: w.id || w.watershedId, name: w.name }));
	}, [dashboard.data, data]);

	const [expandedWatersheds, setExpandedWatersheds] = useState<Set<string>>(new Set());
	useEffect(() => {
		if (!data) return;
		const home = data.homeWatershedId;
		if (home && !expandedWatersheds.has(home)) {
			setExpandedWatersheds(new Set([home]));
		} else if (!home && data.watersheds.length === 1) {
			setExpandedWatersheds(new Set([data.watersheds[0].watershedId]));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.homeWatershedId, data?.watersheds.length]);

	const updateFilters = (patch: Partial<{ craft: string | null; tag: string | null; watershedId: string | null; view: ViewMode }>) => {
		const next = new URLSearchParams(search);
		const apply = (key: string, value: string | null | undefined) => {
			if (value == null || value === '') next.delete(key);
			else next.set(key, value);
		};
		if ('craft' in patch) apply('craft', patch.craft);
		if ('tag' in patch) apply('tag', patch.tag);
		if ('watershedId' in patch) apply('watershed', patch.watershedId);
		if ('view' in patch) apply('view', patch.view === 'year' ? 'year' : null);
		setSearch(next, { replace: true });
	};

	const resultSummary = (() => {
		const total = filteredLogs.length;
		const watersheds = filteredWatersheds.length;
		const sections = new Set(filteredLogs.map(l => l.sectionId)).size;
		const lastDate = filteredLogs[0]?.date;
		return `// ${total} TRIPS · ${sections} SECTIONS · ${watersheds} WATERSHEDS${lastDate ? ` · LAST ${lastDate}` : ''}`;
	})();

	if (!isAuthenticated) return null;

	const renderChrome = (children: React.ReactNode) => (
		<div style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)', minHeight: '100vh' }}>
			{isDesktop ? (
				<AppHeader activePage="logs" />
			) : (
				<header style={{
					height: 52, padding: '0 16px',
					borderBottom: '1px solid var(--rule)',
					background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
					display: 'flex', alignItems: 'center', gap: 12,
					position: 'sticky', top: 0, zIndex: 10,
				}}>
					<button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--river-600)', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', padding: 0 }}>
						<Icon name="chevron-left" size={18} color="var(--river-600)" />
						Rivers
					</button>
					<span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink-0)' }}>Logs</span>
					<span style={{ width: 60 }} />
				</header>
			)}
			<div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 16px 80px' }}>
				{children}
			</div>
		</div>
	);

	if (aggregate.isLoading) {
		return renderChrome(<div style={{ color: 'var(--ink-3)' }}>Loading your logs…</div>);
	}
	if (aggregate.isError || !data) {
		return renderChrome(
			<div style={{
				padding: '24px 20px',
				border: '1px solid var(--rule)',
				borderRadius: 'var(--r-lg)',
				background: 'var(--bg-card)',
				color: 'var(--ink-2)',
				fontSize: 14,
			}}>
				Couldn't load your logs. {aggregate.error instanceof Error ? aggregate.error.message : 'Please try again.'}
			</div>,
		);
	}

	const hasAnyLogs = data.logs.length > 0;
	const profile = data.profile;

	return renderChrome(
		<>
			<div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
				<div>
					<div style={eyebrowStyle}>// MY LOGS</div>
					<h1 style={{ margin: '4px 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--ink-0)' }}>
						{hasAnyLogs ? 'Where you have been' : 'No trips yet'}
					</h1>
					<p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>
						Forecasts look forward. Logs look backward. This is the second axis.
					</p>
				</div>
				<Link
					to="/logs/crafts"
					style={{
						padding: '7px 12px',
						borderRadius: 'var(--r-pill)',
						border: '1px solid var(--rule)',
						background: 'var(--bg-card)',
						color: 'var(--ink-2)',
						textDecoration: 'none',
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						letterSpacing: '0.04em',
						flexShrink: 0,
					}}
				>Crafts ›</Link>
			</div>

			{!hasAnyLogs ? (
				<EmptyState />
			) : (
				<>
					<div style={{ marginBottom: 18 }}>
						<LogFilterBar
							craft={craft}
							tag={tag}
							watershedId={watershedId}
							view={view}
							watersheds={watershedOptions}
							onChange={updateFilters}
							resultSummary={resultSummary}
						/>
					</div>

					{view === 'watershed' ? (
						<WatershedView
							watersheds={filteredWatersheds}
							expanded={expandedWatersheds}
							onToggle={(id) => {
								const next = new Set(expandedWatersheds);
								if (next.has(id)) next.delete(id);
								else next.add(id);
								setExpandedWatersheds(next);
							}}
						/>
					) : (
						<YearView yearGroups={filteredYearGroups} profile={profile || null} />
					)}
				</>
			)}
		</>
	);
}

function EmptyState() {
	return (
		<div style={{
			padding: '24px 20px',
			border: '1px dashed var(--rule)',
			borderRadius: 'var(--r-lg)',
			background: 'var(--bg-tint)',
			color: 'var(--ink-2)',
			fontSize: 14,
			display: 'flex',
			flexDirection: 'column',
			gap: 10,
			alignItems: 'flex-start',
		}}>
			<div>No trips logged yet. Pick any section from the home page and tap <strong>+ Log a trip</strong> to start.</div>
			<Link
				to="/"
				style={{
					padding: '8px 14px',
					borderRadius: 'var(--r-pill)',
					border: '1px solid var(--river-700)',
					background: 'var(--river-700)',
					color: '#fff',
					textDecoration: 'none',
					fontSize: 13,
					fontWeight: 600,
				}}
			>Browse rivers →</Link>
		</div>
	);
}

function WatershedView({ watersheds, expanded, onToggle }: {
	watersheds: MyLogsWatershed[];
	expanded: Set<string>;
	onToggle: (id: string) => void;
}) {
	if (!watersheds.length) {
		return (
			<div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 20, textAlign: 'center' }}>
				No trips match your filters.
			</div>
		);
	}
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			{watersheds.map(w => {
				const isOpen = expanded.has(w.watershedId);
				return (
					<section key={w.watershedId} style={{
						background: 'var(--bg-card)',
						border: '1px solid var(--rule)',
						borderRadius: 'var(--r-lg)',
						overflow: 'hidden',
					}}>
						<button
							type="button"
							onClick={() => onToggle(w.watershedId)}
							style={{
								width: '100%',
								background: 'transparent',
								border: 'none',
								padding: '14px 16px',
								cursor: 'pointer',
								textAlign: 'left',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								gap: 12,
							}}
						>
							<div>
								<div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)' }}>{w.name}</div>
								<div style={{
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									letterSpacing: '0.08em',
									color: 'var(--ink-3)',
									marginTop: 2,
									textTransform: 'uppercase',
								}}>
									// {w.tripCount} TRIPS · {w.sectionCount} SECTIONS{w.lastTripAt ? ` · LAST ${w.lastTripAt}` : ''}
								</div>
							</div>
							<span style={{
								fontFamily: 'var(--font-mono)',
								fontSize: 14,
								color: 'var(--ink-3)',
							}}>{isOpen ? '−' : '+'}</span>
						</button>
						{isOpen && (
							<div style={{ borderTop: '1px solid var(--rule)' }}>
								{w.corridors.map(c => (
									<div key={c.corridorId}>
										<div style={{
											padding: '10px 16px',
											background: 'var(--bg-raised)',
											borderBottom: '1px solid var(--rule)',
											fontFamily: 'var(--font-mono)',
											fontSize: 11,
											letterSpacing: '0.08em',
											textTransform: 'uppercase',
											color: 'var(--ink-3)',
										}}>{c.name} <span style={{ color: 'var(--ink-4)' }}>· {c.tripCount} trips</span></div>
										{c.sections.map(s => (
											<Link
												key={s.sectionId}
												to={`/section/${encodeURIComponent(s.sectionId)}/logs`}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													padding: '12px 16px',
													borderBottom: '1px solid var(--rule)',
													textDecoration: 'none',
													color: 'inherit',
													gap: 10,
												}}
											>
												<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>{s.name}</span>
												<span style={{
													fontFamily: 'var(--font-mono)',
													fontSize: 11,
													color: 'var(--ink-3)',
													letterSpacing: '0.04em',
													textTransform: 'uppercase',
												}}>{s.tripCount} {s.tripCount === 1 ? 'trip' : 'trips'}{s.lastTripAt ? ` · ${s.lastTripAt}` : ''} →</span>
											</Link>
										))}
									</div>
								))}
							</div>
						)}
					</section>
				);
			})}
		</div>
	);
}

function YearView({ yearGroups, profile }: { yearGroups: { year: number; tripCount: number; logs: RiverLogEntry[] }[]; profile: UserProfileEntry | null }) {
	if (!yearGroups.length) {
		return (
			<div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 20, textAlign: 'center' }}>
				No trips match your filters.
			</div>
		);
	}
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
			{yearGroups.map(g => (
				<section key={g.year} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 12,
						letterSpacing: '0.10em',
						textTransform: 'uppercase',
						color: 'var(--ink-3)',
					}}>// {g.year} · {g.tripCount} {g.tripCount === 1 ? 'trip' : 'trips'}</div>
					{g.logs.map(log => (
						<RiverLogCard key={log.id} log={log} profile={profile} />
					))}
				</section>
			))}
		</div>
	);
}
