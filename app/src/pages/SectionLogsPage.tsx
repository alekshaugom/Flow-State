import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSectionLogs } from '../hooks/useSectionLogs';
import { useRiverDetail } from '../hooks/useRiverDetail';
import { RiverLogCard } from '../components/RiverLogCard';

export function SectionLogsPage() {
	const { sectionId } = useParams<{ sectionId: string }>();
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
	}, [isLoading, isAuthenticated, navigate]);

	const detail = useRiverDetail(sectionId);
	const sectionLogs = useSectionLogs(sectionId);

	if (!isAuthenticated) return null;
	if (!sectionId) return null;

	const sectionName = detail.data?.section || sectionId;
	const logs = sectionLogs.data?.logs || [];
	const total = sectionLogs.data?.total ?? 0;
	const profile = sectionLogs.data?.profile || null;

	return (
		<div style={{ maxWidth: 720, margin: '0 auto', padding: 'max(env(safe-area-inset-top), 16px) 16px 80px' }}>
			<div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
				<Link
					to={`/section/${encodeURIComponent(sectionId)}`}
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: 'var(--ink-3)',
						textDecoration: 'none',
					}}>← {sectionName}</Link>
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 11,
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
					color: 'var(--ink-3)',
					marginTop: 4,
				}}>// ALL TRIPS · {total} LOGGED</div>
				<h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
					{sectionName}
				</h1>
			</div>

			{sectionLogs.isLoading ? (
				<div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
			) : logs.length === 0 ? (
				<div style={{
					padding: 16,
					border: '1px dashed var(--rule)',
					borderRadius: 'var(--r-lg)',
					background: 'var(--bg-tint)',
					color: 'var(--ink-3)',
					fontSize: 13,
				}}>
					You haven't logged any trips here yet. <Link to={`/log/new?sectionId=${encodeURIComponent(sectionId)}`} style={{ color: 'var(--river-700)' }}>Log one now.</Link>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{logs.map(log => (
						<RiverLogCard key={log.id} log={log} profile={profile} />
					))}
				</div>
			)}
		</div>
	);
}
