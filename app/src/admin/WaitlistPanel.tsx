import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Icon } from '../components/Icon';

const card: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 20,
	boxShadow: 'var(--shadow-card)',
};
const btn: React.CSSProperties = {
	display: 'inline-flex', alignItems: 'center', gap: 6,
	padding: '6px 14px', borderRadius: 'var(--r-md)',
	fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
	waitlist: { bg: 'var(--low-bg)', text: 'var(--low-solid)' },
	approved: { bg: 'var(--ideal-bg)', text: 'var(--ideal-solid)' },
	denied: { bg: 'var(--danger-bg, #fef2f2)', text: 'var(--danger-solid)' },
};

function timeAgo(ts: string | null): string {
	if (!ts) return '—';
	const diff = Date.now() - new Date(ts).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function WaitlistPanel() {
	const qc = useQueryClient();
	const [search, setSearch] = useState('');

	const { data, isLoading } = useQuery({
		queryKey: ['adminWaitlist'],
		queryFn: api.adminWaitlist,
		refetchInterval: 30_000,
	});

	const actionMutation = useMutation({
		mutationFn: ({ userId, action }: { userId: string; action: 'approve' | 'deny' | 'revoke' }) =>
			api.adminWaitlistAction(userId, action),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWaitlist'] }),
	});

	const allUsers = data?.users || [];
	const users = allUsers.filter((u: any) => {
		if (!search) return true;
		const q = search.toLowerCase();
		return (u.name || '').toLowerCase().includes(q)
			|| (u.email || '').toLowerCase().includes(q);
	});

	const waitlistedCount = allUsers.filter((u: any) => u.status === 'waitlist').length;
	const approvedCount = allUsers.filter((u: any) => u.status === 'approved').length;

	if (isLoading) {
		return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading waitlist...</div>;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{/* Summary */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
				<div style={card}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--ink-0)' }}>{allUsers.length}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Total signups</div>
				</div>
				<div style={card}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--low-solid)' }}>{waitlistedCount}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Waiting</div>
				</div>
				<div style={card}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--ideal-solid)' }}>{approvedCount}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Approved</div>
				</div>
			</div>

			{/* Search */}
			<div style={{
				display: 'flex', alignItems: 'center', gap: 8,
				padding: '10px 14px', borderRadius: 'var(--r-md)',
				background: 'var(--bg-card)', border: '1px solid var(--rule)',
			}}>
				<Icon name="search" size={15} color="var(--ink-3)" />
				<input
					type="text"
					placeholder="Search by name or email..."
					value={search}
					onChange={e => setSearch(e.target.value)}
					style={{
						flex: 1, border: 'none', outline: 'none', background: 'transparent',
						fontSize: 13, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)',
					}}
				/>
				{search && (
					<button onClick={() => setSearch('')} style={{
						background: 'none', border: 'none', cursor: 'pointer', padding: 2,
					}}>
						<Icon name="x-mark" size={14} color="var(--ink-3)" />
					</button>
				)}
			</div>

			{/* Table */}
			<div style={{ ...card, padding: 0, overflow: 'hidden' }}>
				{users.length === 0 ? (
					<div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
						{search ? 'No users match your search.' : 'No waitlist signups yet.'}
					</div>
				) : (
					<table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
						<thead>
							<tr style={{ borderBottom: '1px solid var(--rule)' }}>
								{['Name', 'Email', 'Status', 'Signed up', 'Last login', 'Actions'].map(h => (
									<th key={h} style={{
										textAlign: 'left', padding: '10px 14px',
										fontFamily: 'var(--font-mono)', fontSize: 10,
										letterSpacing: '0.10em', textTransform: 'uppercase',
										color: 'var(--ink-3)', fontWeight: 500,
									}}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{users.map((u: any) => {
								const sc = STATUS_COLORS[u.status] || STATUS_COLORS.waitlist;
								return (
									<tr key={u.id} style={{ borderBottom: '1px solid var(--rule)' }}>
										<td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--ink-0)' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												{u.avatarUrl ? (
													<img src={u.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
												) : (
													<div style={{
														width: 24, height: 24, borderRadius: '50%',
														background: 'var(--bg-sunken)', display: 'flex',
														alignItems: 'center', justifyContent: 'center',
													}}>
														<Icon name="user" size={12} color="var(--ink-3)" />
													</div>
												)}
												{u.name || '—'}
											</div>
										</td>
										<td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
											{u.email || '—'}
										</td>
										<td style={{ padding: '10px 14px' }}>
											<span style={{
												display: 'inline-flex', alignItems: 'center', gap: 4,
												padding: '2px 10px', borderRadius: 'var(--r-pill)',
												fontSize: 11, fontWeight: 600,
												background: sc.bg, color: sc.text,
											}}>
												{u.status}
											</span>
										</td>
										<td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)' }}>
											{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
										</td>
										<td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)' }}>
											{timeAgo(u.lastLoginAt)}
										</td>
										<td style={{ padding: '10px 14px' }}>
											<div style={{ display: 'flex', gap: 6 }}>
												{u.status === 'waitlist' && (
													<>
														<button
															style={{ ...btn, background: 'var(--ideal-bg)', color: 'var(--ideal-solid)' }}
															disabled={actionMutation.isPending}
															onClick={() => actionMutation.mutate({ userId: u.id, action: 'approve' })}
														>
															<Icon name="check" size={12} color="var(--ideal-solid)" />
															Approve
														</button>
														<button
															style={{ ...btn, background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger-solid)' }}
															disabled={actionMutation.isPending}
															onClick={() => actionMutation.mutate({ userId: u.id, action: 'deny' })}
														>
															<Icon name="x-mark" size={12} color="var(--danger-solid)" />
															Deny
														</button>
													</>
												)}
												{u.status === 'approved' && (
													<button
														style={{ ...btn, background: 'var(--bg-sunken)', color: 'var(--ink-2)' }}
														disabled={actionMutation.isPending}
														onClick={() => actionMutation.mutate({ userId: u.id, action: 'revoke' })}
													>
														Revoke
													</button>
												)}
												{u.status === 'denied' && (
													<button
														style={{ ...btn, background: 'var(--ideal-bg)', color: 'var(--ideal-solid)' }}
														disabled={actionMutation.isPending}
														onClick={() => actionMutation.mutate({ userId: u.id, action: 'approve' })}
													>
														<Icon name="check" size={12} color="var(--ideal-solid)" />
														Approve
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
