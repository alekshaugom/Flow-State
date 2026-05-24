import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Icon } from '../components/Icon';

const card: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 20,
	boxShadow: 'var(--shadow-card)',
};

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
	textTransform: 'uppercase', color: 'var(--river-600)', fontWeight: 500, marginBottom: 8,
};

export function AdminRequestsPanel() {
	const navigate = useNavigate();
	const requests = useQuery({
		queryKey: ['admin-river-requests'],
		queryFn: api.adminRiverRequests,
		refetchInterval: 30_000,
	});

	if (requests.isLoading) {
		return <div style={{ ...card, padding: 28, fontSize: 13, color: 'var(--ink-3)' }}>Loading requests…</div>;
	}

	if (requests.isError) {
		return (
			<div style={{ ...card, padding: 28, color: 'var(--danger-solid)' }}>
				Failed to load requests: {(requests.error as Error)?.message || 'unknown error'}
			</div>
		);
	}

	const rows = requests.data?.requests || [];

	if (rows.length === 0) {
		return (
			<div style={{ ...card, padding: 40, textAlign: 'center' }}>
				<Icon name="map" size={32} color="var(--ink-3)" />
				<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '12px 0 8px' }}>No requests yet</h3>
				<p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
					When users request flow data for non-Colorado rivers, they appear here, ranked by demand.
				</p>
			</div>
		);
	}

	return (
		<div style={{ ...card, padding: 0, overflow: 'hidden' }}>
			<div style={{ padding: '20px 20px 12px' }}>
				<div style={labelStyle}>Demand</div>
				<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 4px' }}>
					Requested rivers ({rows.length})
				</h3>
				<p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
					Ranked by request count, then most recent. Click a row to open the river page.
				</p>
			</div>
			<div style={{ overflowX: 'auto' }}>
				<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
					<thead>
						<tr style={{ borderBottom: '1px solid var(--rule)', background: 'var(--bg-sunken)' }}>
							{['River', 'Country', 'Continent', 'Difficulty', 'Requests', 'Distinct users', 'Last requested'].map(h => (
								<th key={h} style={{
									textAlign: h === 'Requests' || h === 'Distinct users' ? 'right' : 'left',
									padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
									letterSpacing: '0.10em', textTransform: 'uppercase',
									color: 'var(--ink-3)', fontWeight: 500,
								}}>{h}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((r, idx) => (
							<tr
								key={r.worldRiverId}
								onClick={() => navigate(`/river/${encodeURIComponent(r.worldRiverId)}`)}
								style={{
									borderBottom: '1px solid var(--rule)',
									cursor: 'pointer',
									background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
								}}
							>
								<td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-0)' }}>
									{r.name}
									{r.region && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · {r.region}</span>}
								</td>
								<td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{r.country}</td>
								<td style={{ padding: '10px 12px', color: 'var(--ink-3)' }}>{r.continent}</td>
								<td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{r.difficulty || '—'}</td>
								<td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.count}</td>
								<td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{r.distinctUsers}</td>
								<td style={{ padding: '10px 12px', color: 'var(--ink-2)', fontSize: 12 }}>
									{r.lastRequestedAt ? new Date(r.lastRequestedAt).toLocaleString() : '—'}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
