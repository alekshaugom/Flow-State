import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/Icon';
import { AppHeader } from '../components/AppHeader';
import { AdminUsersPanel } from './AdminUsersPanel';
import { AdminRequestsPanel } from './AdminRequestsPanel';

const card: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 20,
	boxShadow: 'var(--shadow-card)',
};
const label: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
	textTransform: 'uppercase', color: 'var(--river-600)', fontWeight: 500, marginBottom: 8,
};
const btn: React.CSSProperties = {
	display: 'inline-flex', alignItems: 'center', gap: 6,
	padding: '8px 16px', borderRadius: 'var(--r-md)',
	background: 'var(--river-700)', color: 'white',
	border: 'none', fontSize: 13, fontWeight: 600,
};
const btnOutline: React.CSSProperties = {
	...btn,
	background: 'var(--bg-card)', color: 'var(--ink-1)',
	border: '1px solid var(--rule)',
};

type AdminTab = 'data' | 'users' | 'requests';

export function AdminPage() {
	const navigate = useNavigate();
	const auth = useAuth();
	const qc = useQueryClient();
	const [message, setMessage] = useState('');
	const [tab, setTab] = useState<AdminTab>('data');

	const seedStatus = useQuery({ queryKey: ['seedStatus'], queryFn: api.seedStatus });
	const ingestion = useQuery({ queryKey: ['ingestion'], queryFn: api.ingestionStatus, refetchInterval: 10_000 });
	const logs = useQuery({ queryKey: ['ingestionLogs'], queryFn: api.ingestionLogs, refetchInterval: 30_000 });
	const health = useQuery({ queryKey: ['dataHealth'], queryFn: api.dataHealth, refetchInterval: 30_000 });

	const seedMutation = useMutation({
		mutationFn: api.seed,
		onSuccess: (d) => {
			setMessage(`Seeded: ${d.rivers} rivers, ${d.sections} sections, ${d.gauges} gauges`);
			qc.invalidateQueries({ queryKey: ['seedStatus'] });
			qc.invalidateQueries({ queryKey: ['dashboard'] });
		},
		onError: (e: Error) => setMessage(`Seed failed: ${e.message}`),
	});

	const ingestMutation = useMutation({
		mutationFn: (args: { action: string; source?: string; days?: number }) => api.triggerIngestion(args.action, args),
		onSuccess: (d) => {
			setMessage(`Ingestion: ${JSON.stringify(d)}`);
			qc.invalidateQueries({ queryKey: ['ingestion'] });
			qc.invalidateQueries({ queryKey: ['ingestionLogs'] });
		},
		onError: (e: Error) => setMessage(`Ingestion failed: ${e.message}`),
	});

	const busy = seedMutation.isPending || ingestMutation.isPending;

	return (
		<div style={{
			width: '100%', minHeight: '100vh',
			background: 'var(--bg-app)',
			fontFamily: 'var(--font-sans)',
			color: 'var(--ink-1)',
		}}>
			<AppHeader activePage="admin" />

			<div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 28px' }}>
				<div style={{
					fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
					letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
				}}>
					System controls
				</div>
				<h1 style={{ margin: '4px 0 16px', fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
					Admin
				</h1>

				{/* Tabs */}
				<div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
					{(['data', 'users', 'requests'] as AdminTab[]).map(t => (
						<button key={t} onClick={() => setTab(t)} style={{
							padding: '8px 16px', borderRadius: 'var(--r-md)',
							fontSize: 13, fontWeight: 600, cursor: 'pointer',
							background: tab === t ? 'var(--bg-sunken)' : 'transparent',
							color: tab === t ? 'var(--ink-0)' : 'var(--ink-3)',
							border: tab === t ? '1px solid var(--rule)' : '1px solid transparent',
						}}>
							{t === 'data' ? 'Data' : t === 'users' ? 'Users' : 'Requests'}
						</button>
					))}
				</div>

				{!auth.isLoading && !auth.isApproved && (tab === 'users' || tab === 'requests') ? (
					<div style={{
						...card, textAlign: 'center', padding: 40,
					}}>
						<Icon name="shield" size={32} color="var(--ink-3)" />
						<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '12px 0 8px' }}>
							Admin access required
						</h3>
						<p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 16px' }}>
							You need an approved account to manage the waitlist.
						</p>
						{!auth.isAuthenticated && (
							<button onClick={() => navigate('/login')} style={btn}>Sign in</button>
						)}
					</div>
				) : tab === 'users' ? (
					<AdminUsersPanel />
				) : tab === 'requests' ? (
					<AdminRequestsPanel />
				) : (
					<>
						{message && (
							<div style={{
								...card, marginBottom: 16,
								background: 'var(--bg-tint)', border: '1px solid var(--river-100)',
								fontSize: 13, color: 'var(--ink-1)',
							}}>
								{message}
							</div>
						)}

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
							{/* Seed */}
							<div style={card}>
								<div style={label}>Database</div>
								<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 8px' }}>Seed Data</h3>
								{seedStatus.data && (
									<div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
										{seedStatus.data.seeded ? (
											<>{seedStatus.data.counts.rivers} rivers, {seedStatus.data.counts.sections} sections, {seedStatus.data.counts.gauges} gauges</>
										) : (
											<span style={{ color: 'var(--low-solid)' }}>Database not seeded yet</span>
										)}
									</div>
								)}
								<button style={btn} disabled={busy} onClick={() => seedMutation.mutate()}>
									<Icon name="refresh" size={14} color="white" />
									{seedMutation.isPending ? 'Seeding...' : 'Run Seed'}
								</button>
							</div>

							{/* Ingestion */}
							<div style={card}>
								<div style={label}>Ingestion</div>
								<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 8px' }}>Fetch Data</h3>
								{ingestion.data && (
									<div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.6 }}>
										<div>Worker: <span style={{ fontFamily: 'var(--font-mono)', color: ingestion.data.worker_started ? 'var(--ideal-solid)' : 'var(--low-solid)' }}>{ingestion.data.worker_started ? 'Running' : 'Stopped'}</span></div>
										<div>Last gauge: <span style={{ fontFamily: 'var(--font-mono)' }}>{ingestion.data.last_gauge_fetch || 'Never'}</span></div>
										<div>Last snow: <span style={{ fontFamily: 'var(--font-mono)' }}>{ingestion.data.last_snow_fetch || 'Never'}</span></div>
									</div>
								)}
								<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									<button style={btn} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run' })}>Fetch All</button>
									<button style={btnOutline} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'run', source: 'usgs' })}>USGS Only</button>
									<button style={btnOutline} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'backfill', days: 7 })}>Backfill 7d</button>
									<button style={btnOutline} disabled={busy} onClick={() => ingestMutation.mutate({ action: 'backfill', days: 30 })}>Backfill 30d</button>
								</div>
							</div>

							{/* Data Health */}
							<div style={{ ...card, gridColumn: '1 / -1' }}>
								<div style={label}>Health</div>
								<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 12px' }}>Data Source Health</h3>
								{health.data ? (
									<div style={{ overflowX: 'auto' }}>
										<table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
											<thead>
												<tr style={{ borderBottom: '1px solid var(--rule)' }}>
													{['Source', 'Type', 'Last fetch', 'Last records', 'Latest data', 'Total rows'].map(h => (
														<th key={h} style={{
															textAlign: h.includes('records') || h.includes('rows') ? 'right' : 'left',
															padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
															letterSpacing: '0.10em', textTransform: 'uppercase',
															color: 'var(--ink-3)', fontWeight: 500,
														}}>{h}</th>
													))}
												</tr>
											</thead>
											<tbody>
												{(health.data.sources || []).map((s: any) => {
													const records = s.lastLog?.recordsProcessed;
													const recordColor = records === 0 || records == null
														? 'var(--ink-3)'
														: 'var(--ideal-solid)';
													const data = s.data || {};
													const tableRowsColor = (data.totalRows || 0) === 0 ? 'var(--low-solid)' : 'var(--ink-1)';
													return (
														<tr key={s.id} style={{ borderBottom: '1px solid var(--rule)' }}>
															<td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.id}</td>
															<td style={{ padding: '8px 10px', color: 'var(--ink-3)' }}>{s.type}</td>
															<td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)' }}>
																{s.lastFetchAgeMin != null ? `${s.lastFetchAgeMin} min ago` : '—'}
															</td>
															<td style={{
																padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)',
																color: recordColor,
															}}>
																{records != null ? records : '—'}
															</td>
															<td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)' }}>
																{data.ageMin != null ? `${data.ageMin} min ago` : '—'}
															</td>
															<td style={{
																padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)',
																color: tableRowsColor,
															}}>
																{data.totalRows != null ? data.totalRows.toLocaleString() : '—'}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
										{health.data.tables && (
											<div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
												<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
													Tables
												</div>
												<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
													{Object.entries(health.data.tables).map(([name, info]: any) => (
														<div key={name} style={{
															padding: '8px 12px', borderRadius: 'var(--r-md)',
															background: 'var(--bg-sunken)', border: '1px solid var(--rule)',
															fontFamily: 'var(--font-mono)', fontSize: 12,
															color: info.totalRows > 0 ? 'var(--ink-1)' : 'var(--low-solid)',
														}}>
															<span style={{ fontWeight: 600 }}>{name}</span>
															<span style={{ color: 'var(--ink-3)', margin: '0 6px' }}>·</span>
															<span>{info.totalRows.toLocaleString()} rows</span>
															{info.ageMin != null && (
																<>
																	<span style={{ color: 'var(--ink-3)', margin: '0 6px' }}>·</span>
																	<span style={{ color: 'var(--ink-3)' }}>{info.ageMin}m ago</span>
																</>
															)}
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								) : (
									<div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '12px 0' }}>Loading data health...</div>
								)}
							</div>

							{/* Logs */}
							<div style={{ ...card, gridColumn: '1 / -1' }}>
								<div style={label}>History</div>
								<h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', margin: '0 0 12px' }}>Recent Ingestion Logs</h3>
								{logs.data && Array.isArray(logs.data) && logs.data.length > 0 ? (
									<div style={{ overflowX: 'auto' }}>
										<table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
											<thead>
												<tr style={{ borderBottom: '1px solid var(--rule)' }}>
													{['Source', 'Status', 'Records', 'Duration', 'Time', 'Errors'].map(h => (
														<th key={h} style={{
															textAlign: h === 'Records' || h === 'Duration' ? 'right' : 'left',
															padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
															letterSpacing: '0.10em', textTransform: 'uppercase',
															color: 'var(--ink-3)', fontWeight: 500,
														}}>{h}</th>
													))}
												</tr>
											</thead>
											<tbody>
												{logs.data.map((log: any) => (
													<tr key={log.id} style={{ borderBottom: '1px solid var(--rule)' }}>
														<td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{log.sourceId}</td>
														<td style={{
															padding: '8px 10px', fontWeight: 600,
															color: log.status === 'success' ? 'var(--ideal-solid)' : log.status === 'error' ? 'var(--danger-solid)' : 'var(--low-solid)',
														}}>{log.status}</td>
														<td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{log.recordsProcessed}</td>
														<td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
														<td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
														<td style={{ padding: '8px 10px', color: 'var(--danger-solid)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.errors || '—'}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '12px 0' }}>No ingestion logs yet. Run an ingestion to see results.</div>
								)}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
