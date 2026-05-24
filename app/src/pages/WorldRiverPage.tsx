import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type WorldRiverEntry } from '../api';
import { useAuth } from '../hooks/useAuth';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';

const card: React.CSSProperties = {
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)',
	padding: 24,
	boxShadow: 'var(--shadow-card)',
};

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.14em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 6,
};

const pill: React.CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 6,
	padding: '6px 12px',
	borderRadius: 'var(--r-pill)',
	background: 'var(--bg-tint)',
	border: '1px solid var(--river-100)',
	fontSize: 12,
	fontWeight: 600,
	color: 'var(--river-700)',
};

const primaryBtn: React.CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 8,
	padding: '12px 20px',
	borderRadius: 'var(--r-md)',
	background: 'var(--river-700)',
	color: 'white',
	border: 'none',
	fontSize: 14,
	fontWeight: 600,
	cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
	...primaryBtn,
	background: 'var(--bg-card)',
	color: 'var(--ink-1)',
	border: '1px solid var(--rule)',
};

export function WorldRiverPage() {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const auth = useAuth();
	const qc = useQueryClient();
	const [note, setNote] = useState('');

	const river = useQuery<WorldRiverEntry>({
		queryKey: ['world-river', slug],
		queryFn: () => api.worldRiver(slug!),
		enabled: !!slug,
		retry: 0,
	});

	const myReqs = useQuery({
		queryKey: ['my-river-requests'],
		queryFn: api.myRiverRequests,
		enabled: !!slug && auth.isAuthenticated,
		staleTime: 60_000,
	});

	const requestMut = useMutation({
		mutationFn: ({ id, n }: { id: string; n: string }) => api.requestRiver(id, n || undefined),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['my-river-requests'] });
		},
	});

	const alreadyRequested = !!myReqs.data?.requests?.find((r: any) => r.worldRiverId === slug);

	function onRequestClick() {
		if (!auth.isAuthenticated) {
			navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
			return;
		}
		if (!river.data) return;
		requestMut.mutate({ id: river.data.id, n: note });
	}

	if (river.isLoading) {
		return (
			<div style={shellStyle}>
				<AppHeader activePage="rivers" />
				<div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 28px' }}>
					<Skeleton width="40%" height={14} />
					<Skeleton width="70%" height={36} style={{ marginTop: 8 }} />
					<Skeleton width="100%" height={120} style={{ marginTop: 16 }} borderRadius="var(--r-lg)" />
				</div>
			</div>
		);
	}

	if (river.isError || !river.data) {
		return (
			<div style={shellStyle}>
				<AppHeader activePage="rivers" />
				<div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 28px' }}>
					<div style={{ ...card, textAlign: 'center', padding: 40 }}>
						<Icon name="map" size={32} color="var(--ink-3)" />
						<h2 style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 8px' }}>River not found</h2>
						<p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 16px' }}>
							We couldn't find a river with the slug "{slug}". Try searching from the home page.
						</p>
						<button onClick={() => navigate('/')} style={primaryBtn}>Back to home</button>
					</div>
				</div>
			</div>
		);
	}

	const r = river.data;
	const sectionsList = (r.sections || '').split(/,\s*/).filter(Boolean);
	const altNames: string[] = (() => {
		try { return JSON.parse(r.alternateNamesJson || '[]'); } catch { return []; }
	})();

	return (
		<div style={shellStyle}>
			<AppHeader activePage="rivers" />
			<div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 28px 48px' }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
					{r.continent} · {r.country}{r.region ? ' · ' + r.region : ''}
				</div>
				<h1 style={{ margin: '4px 0 16px', fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
					{r.name}
				</h1>

				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
					{r.difficulty && <span style={pill}><Icon name="star" size={12} color="var(--river-700)" /> {r.difficulty}</span>}
					{altNames.length > 0 && altNames.map(a => (
						<span key={a} style={{ ...pill, background: 'var(--bg-sunken)', borderColor: 'var(--rule)', color: 'var(--ink-2)' }}>
							also called {a}
						</span>
					))}
				</div>

				<div style={{ ...card, marginBottom: 16, background: 'var(--bg-tint)', border: '1px solid var(--river-100)' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
						<Icon name="bell" size={16} color="var(--river-700)" />
						<div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
							Live flow data not yet tracked for this river
						</div>
					</div>
					<p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 12px', lineHeight: 1.5 }}>
						Flow State focuses on Colorado at launch. Want to see real-time gauge data and forecasts for {r.name}? Request it below.
					</p>
					{auth.isAuthenticated ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<textarea
								value={note}
								onChange={e => setNote(e.target.value.slice(0, 500))}
								placeholder="Optional: tell us why this river matters (helps prioritize)"
								rows={3}
								style={{
									width: '100%', boxSizing: 'border-box',
									padding: 10, borderRadius: 'var(--r-md)',
									border: '1px solid var(--rule)', fontSize: 13,
									fontFamily: 'var(--font-sans)', resize: 'vertical',
									background: 'var(--bg-card)', color: 'var(--ink-0)',
								}}
							/>
							<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
								<button
									onClick={onRequestClick}
									disabled={requestMut.isPending}
									style={alreadyRequested ? outlineBtn : primaryBtn}
								>
									<Icon name="check" size={14} color={alreadyRequested ? 'var(--ink-1)' : 'white'} />
									{requestMut.isPending
										? 'Sending…'
										: alreadyRequested
											? 'Request updated · update note'
											: 'Request flow data for this river'}
								</button>
								{requestMut.isSuccess && (
									<span style={{ fontSize: 12, color: 'var(--ideal-solid)' }}>
										Logged. Thanks!
									</span>
								)}
								{requestMut.isError && (
									<span style={{ fontSize: 12, color: 'var(--danger-solid)' }}>
										Couldn't save — try again.
									</span>
								)}
							</div>
						</div>
					) : (
						<button onClick={onRequestClick} style={primaryBtn}>
							<Icon name="user" size={14} color="white" />
							Sign in to request flow data
						</button>
					)}
				</div>

				{r.note && (
					<div style={{ ...card, marginBottom: 16 }}>
						<div style={labelStyle}>About</div>
						<p style={{ fontSize: 14, color: 'var(--ink-1)', margin: 0, lineHeight: 1.6 }}>{r.note}</p>
					</div>
				)}

				{sectionsList.length > 0 && (
					<div style={{ ...card, marginBottom: 16 }}>
						<div style={labelStyle}>Sections</div>
						<ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, color: 'var(--ink-1)', lineHeight: 1.8 }}>
							{sectionsList.map((s, i) => <li key={i}>{s}</li>)}
						</ul>
					</div>
				)}

				<div style={{ ...card, marginBottom: 16 }}>
					<div style={labelStyle}>References</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
						{r.learnMoreUrl && (
							<a href={r.learnMoreUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--river-700)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								<Icon name="arrow-right" size={14} color="var(--river-700)" />
								Learn more on {r.learnMoreUrl.includes('americanwhitewater') ? 'American Whitewater' : 'Wikipedia'}
							</a>
						)}
						{r.wikidataId && (
							<a href={`https://www.wikidata.org/wiki/${r.wikidataId}`} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
								<Icon name="arrow-right" size={12} color="var(--ink-3)" />
								Wikidata · {r.wikidataId}
							</a>
						)}
					</div>
				</div>

				{hasAnyCoord(r) && (
					<div style={{ ...card }}>
						<div style={labelStyle}>Coordinates</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
							{r.sourceLat != null && r.sourceLon != null && (
								<>
									<span style={{ color: 'var(--ink-3)' }}>Source</span>
									<span>{r.sourceLat.toFixed(4)}, {r.sourceLon.toFixed(4)}</span>
								</>
							)}
							{r.centerLat != null && r.centerLon != null && (
								<>
									<span style={{ color: 'var(--ink-3)' }}>Center</span>
									<span>{r.centerLat.toFixed(4)}, {r.centerLon.toFixed(4)}</span>
								</>
							)}
							{r.mouthLat != null && r.mouthLon != null && (
								<>
									<span style={{ color: 'var(--ink-3)' }}>Mouth</span>
									<span>{r.mouthLat.toFixed(4)}, {r.mouthLon.toFixed(4)}</span>
								</>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function hasAnyCoord(r: WorldRiverEntry): boolean {
	return [r.sourceLat, r.centerLat, r.mouthLat].some(v => v != null);
}

const shellStyle: React.CSSProperties = {
	width: '100%',
	minHeight: '100vh',
	background: 'var(--bg-app)',
	fontFamily: 'var(--font-sans)',
	color: 'var(--ink-1)',
};
