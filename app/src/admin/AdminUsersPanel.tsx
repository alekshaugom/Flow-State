import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Icon } from '../components/Icon';
import type { AdminInviteUserResult, AdminLoginLinkResult } from '../types';

const card: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 16,
	boxShadow: 'var(--shadow-card)',
};

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '8px 10px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 13,
	fontFamily: 'inherit',
	boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
	textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500,
	marginBottom: 4, display: 'block',
};

const btnPrimary: React.CSSProperties = {
	padding: '7px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--river-700)',
	background: 'var(--river-700)',
	color: '#fff',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
	padding: '7px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-2)',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
	padding: '7px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid #d99',
	background: 'var(--bg-card)',
	color: '#a02323',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
	waitlist: { bg: 'var(--low-bg)', text: 'var(--low-solid)' },
	approved: { bg: 'var(--ideal-bg)', text: 'var(--ideal-solid)' },
	denied: { bg: 'var(--danger-bg, #fef2f2)', text: 'var(--danger-solid)' },
};

function displayUserName(u: any): string {
	const first = (u?.firstName || '').trim();
	const last = (u?.lastName || '').trim();
	if (first || last) return [first, last].filter(Boolean).join(' ');
	return u?.name || '—';
}

function timeAgo(ts: string | null | undefined): string {
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

export function AdminUsersPanel() {
	const qc = useQueryClient();
	const waitlist = useQuery({ queryKey: ['adminWaitlist'], queryFn: api.adminWaitlist, refetchInterval: 30_000 });
	const [search, setSearch] = useState('');
	const [openUserId, setOpenUserId] = useState<string | null>(null);
	const [inviteOpen, setInviteOpen] = useState(false);

	const allUsers = waitlist.data?.users || [];
	const users = allUsers.filter((u: any) => {
		if (!search) return true;
		const q = search.toLowerCase();
		return displayUserName(u).toLowerCase().includes(q)
			|| (u.email || '').toLowerCase().includes(q);
	});

	const waitlistedCount = allUsers.filter((u: any) => u.status === 'waitlist').length;
	const approvedCount = allUsers.filter((u: any) => u.status === 'approved').length;

	const actionMutation = useMutation({
		mutationFn: ({ userId, action }: { userId: string; action: 'approve' | 'deny' | 'revoke' }) =>
			api.adminWaitlistAction(userId, action),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWaitlist'] }),
	});

	const deleteMutation = useMutation({
		mutationFn: (userId: string) => api.adminDeleteUser(userId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWaitlist'] }),
	});

	if (waitlist.isLoading) {
		return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading users…</div>;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{/* Summary tiles */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
				<div style={card}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--ink-0)' }}>{allUsers.length}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Total users</div>
				</div>
				<div style={card}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--ideal-solid)' }}>{approvedCount}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Approved</div>
				</div>
				<div style={card}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--low-solid)' }}>{waitlistedCount}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Waitlist</div>
				</div>
			</div>

			{/* Invite */}
			{!inviteOpen ? (
				<div>
					<button
						type="button"
						onClick={() => setInviteOpen(true)}
						style={btnPrimary}
					>+ Invite user</button>
				</div>
			) : (
				<InviteUserForm
					onClose={() => setInviteOpen(false)}
					onCreated={() => qc.invalidateQueries({ queryKey: ['adminWaitlist'] })}
				/>
			)}

			{/* Search */}
			<div style={{
				display: 'flex', alignItems: 'center', gap: 8,
				padding: '10px 14px', borderRadius: 'var(--r-md)',
				background: 'var(--bg-card)', border: '1px solid var(--rule)',
			}}>
				<Icon name="search" size={15} color="var(--ink-3)" />
				<input
					type="text"
					placeholder="Search by name or email…"
					value={search}
					onChange={e => setSearch(e.target.value)}
					style={{
						flex: 1, border: 'none', outline: 'none', background: 'transparent',
						fontSize: 13, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)',
					}}
				/>
				{search && (
					<button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
						<Icon name="x-mark" size={14} color="var(--ink-3)" />
					</button>
				)}
			</div>

			{/* User list */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{users.length === 0 ? (
					<div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
						{search ? 'No users match your search.' : 'No users yet. Invite someone above.'}
					</div>
				) : (
					users.map((u: any) => {
						const sc = STATUS_COLORS[u.status] || STATUS_COLORS.waitlist;
						const isOpen = openUserId === u.id;
						return (
							<div key={u.id} style={card}>
								<div style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									gap: 12,
									flexWrap: 'wrap',
								}}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
										{u.avatarUrl ? (
											<img src={u.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
										) : (
											<div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
												<Icon name="user" size={14} color="var(--ink-3)" />
											</div>
										)}
										<div style={{ minWidth: 0 }}>
											<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>{displayUserName(u)}</div>
											<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
												{u.email || u.id}
												<span style={{ color: 'var(--ink-4)', margin: '0 6px' }}>·</span>
												{timeAgo(u.lastLoginAt) === '—' ? 'no logins' : `last seen ${timeAgo(u.lastLoginAt)}`}
											</div>
										</div>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
										<span style={{
											display: 'inline-flex', alignItems: 'center', gap: 4,
											padding: '2px 10px', borderRadius: 'var(--r-pill)',
											fontSize: 11, fontWeight: 600,
											background: sc.bg, color: sc.text,
										}}>{u.status}</span>
										{u.status === 'waitlist' && (
											<>
												<button style={btnPrimary} disabled={actionMutation.isPending}
													onClick={() => actionMutation.mutate({ userId: u.id, action: 'approve' })}>Approve</button>
												<button style={btnGhost} disabled={actionMutation.isPending}
													onClick={() => actionMutation.mutate({ userId: u.id, action: 'deny' })}>Deny</button>
											</>
										)}
										{u.status === 'approved' && (
											<>
												<button style={btnGhost}
													onClick={() => setOpenUserId(isOpen ? null : u.id)}
												>{isOpen ? 'Hide controls' : 'Manage credentials'}</button>
												<button style={btnDanger} disabled={deleteMutation.isPending}
													onClick={() => {
														const name = displayUserName(u);
														if (!window.confirm(`Delete ${name} (${u.email})?\n\nThis purges their account AND all of their data — logs, profile, saved crafts, credentials, and any active login links. Cannot be undone.`)) return;
														deleteMutation.mutate(u.id);
													}}
												>Delete</button>
											</>
										)}
										{u.status === 'denied' && (
											<button style={btnPrimary} disabled={actionMutation.isPending}
												onClick={() => actionMutation.mutate({ userId: u.id, action: 'approve' })}>Approve</button>
										)}
									</div>
								</div>
								{isOpen && u.status === 'approved' && (
									<UserCredentialControls userId={u.id} onChange={() => qc.invalidateQueries({ queryKey: ['adminWaitlist'] })} />
								)}
							</div>
						);
					})
				)}
			</div>

			{deleteMutation.isSuccess && deleteMutation.data && (
				<div style={{
					padding: '10px 12px',
					borderRadius: 'var(--r-md)',
					background: 'var(--river-50)',
					border: '1px solid var(--river-100)',
					color: 'var(--river-800)',
					fontSize: 12,
				}}>
					Deleted user + {deleteMutation.data.deleted.logs} logs, {deleteMutation.data.deleted.crafts} crafts, {deleteMutation.data.deleted.tokens} tokens, {deleteMutation.data.deleted.credential ? 'credential' : 'no credential'}, {deleteMutation.data.deleted.profile ? 'profile' : 'no profile'}.
				</div>
			)}
		</div>
	);
}

function InviteUserForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
	const [email, setEmail] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<AdminInviteUserResult | null>(null);
	const [linkCopied, setLinkCopied] = useState(false);

	const invite = useMutation({
		mutationFn: () => api.adminInviteUser({
			email: email.trim(),
			firstName: firstName.trim(),
			lastName: lastName.trim(),
		}),
		onSuccess: (res) => {
			setError(null);
			setResult(res);
			onCreated();
		},
		onError: (e: any) => setError(e?.message || 'Failed to invite user'),
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!email.trim() || !firstName.trim() || !lastName.trim()) {
			setError('Email, first name, and last name are all required');
			return;
		}
		invite.mutate();
	};

	const onCopyLink = async () => {
		if (!result?.link?.url) return;
		try {
			await navigator.clipboard.writeText(result.link.url);
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2000);
		} catch {
			setLinkCopied(false);
		}
	};

	const onAnother = () => {
		setEmail('');
		setFirstName('');
		setLastName('');
		setResult(null);
		setError(null);
		setLinkCopied(false);
	};

	if (result) {
		return (
			<div style={{
				...card,
				background: 'var(--river-50)',
				border: '1px solid var(--river-100)',
				display: 'flex',
				flexDirection: 'column',
				gap: 10,
			}}>
				<div style={{
					fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
					textTransform: 'uppercase', color: 'var(--river-800)',
				}}>USER INVITED</div>
				<div style={{ fontSize: 14, color: 'var(--ink-0)' }}>
					<strong>{result.user.name}</strong> · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{result.user.email}</span>
				</div>
				<div style={{ fontSize: 12, color: 'var(--river-800)' }}>
					Send this one-time login link to the user — they'll pick their own password on first click. Expires in 24h.
				</div>
				<div style={{
					padding: '8px 10px',
					borderRadius: 'var(--r-sm)',
					background: 'var(--bg-card)',
					fontFamily: 'var(--font-mono)',
					fontSize: 11,
					wordBreak: 'break-all',
					color: 'var(--ink-1)',
					border: '1px solid var(--rule)',
				}}>{result.link.url}</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<button type="button" onClick={onCopyLink} style={btnPrimary}>{linkCopied ? 'Copied ✓' : 'Copy link'}</button>
					<button type="button" onClick={onAnother} style={btnGhost}>Invite another</button>
					<button type="button" onClick={onClose} style={btnGhost}>Done</button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
				<div style={{
					fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
					textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500,
				}}>INVITE NEW USER</div>
				<button type="button" onClick={onClose} style={{
					background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, padding: 0,
				}}>×</button>
			</div>
			<div>
				<label style={labelStyle} htmlFor="invite-email">Email</label>
				<input
					id="invite-email"
					type="email"
					autoComplete="off"
					style={inputStyle}
					value={email}
					onChange={e => setEmail(e.target.value)}
					required
				/>
			</div>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
				<div>
					<label style={labelStyle} htmlFor="invite-first">First name</label>
					<input
						id="invite-first"
						style={inputStyle}
						value={firstName}
						onChange={e => setFirstName(e.target.value)}
						required
					/>
				</div>
				<div>
					<label style={labelStyle} htmlFor="invite-last">Last name</label>
					<input
						id="invite-last"
						style={inputStyle}
						value={lastName}
						onChange={e => setLastName(e.target.value)}
						required
					/>
				</div>
			</div>
			{error && <div style={{ padding: '6px 10px', borderRadius: 'var(--r-md)', background: '#fdecea', color: '#a02323', fontSize: 12 }}>{error}</div>}
			<div style={{ display: 'flex', gap: 8 }}>
				<button type="submit" style={btnPrimary} disabled={invite.isPending}>
					{invite.isPending ? 'Inviting…' : 'Invite user'}
				</button>
				<button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
			</div>
			<div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
				The user is created approved. They'll get a one-time login link to copy and send; on first click they pick their own password.
			</div>
		</form>
	);
}

function UserCredentialControls({ userId, onChange }: { userId: string; onChange: () => void }) {
	const [password, setPassword] = useState('');
	const [pwMessage, setPwMessage] = useState<string | null>(null);
	const [pwError, setPwError] = useState<string | null>(null);
	const [linkResult, setLinkResult] = useState<AdminLoginLinkResult | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	const [linkCopied, setLinkCopied] = useState(false);

	const tokensQuery = useQuery({
		queryKey: ['adminLoginTokens', userId],
		queryFn: () => api.adminListLoginTokens(userId),
	});

	const setPasswordMutation = useMutation({
		mutationFn: () => api.adminSetPassword(userId, password),
		onSuccess: (res) => {
			setPwMessage(res.hadPriorPassword ? 'Password updated.' : 'Password set.');
			setPwError(null);
			setPassword('');
			onChange();
		},
		onError: (e: any) => {
			setPwError(e?.message || 'Failed to set password');
			setPwMessage(null);
		},
	});

	const createLinkMutation = useMutation({
		mutationFn: () => api.adminCreateLoginLink(userId),
		onSuccess: (res) => {
			setLinkResult(res);
			setLinkError(null);
			tokensQuery.refetch();
		},
		onError: (e: any) => setLinkError(e?.message || 'Failed to create login link'),
	});

	const revokeMutation = useMutation({
		mutationFn: (tokenId: string) => api.adminRevokeLoginToken(userId, tokenId),
		onSuccess: () => tokensQuery.refetch(),
	});

	const onSetPassword = (e: React.FormEvent) => {
		e.preventDefault();
		setPwMessage(null);
		setPwError(null);
		if (password.length < 8) { setPwError('Password must be at least 8 characters'); return; }
		setPasswordMutation.mutate();
	};

	const onCopyLink = async () => {
		if (!linkResult?.url) return;
		try {
			await navigator.clipboard.writeText(linkResult.url);
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2000);
		} catch {}
	};

	const activeTokens = (tokensQuery.data?.tokens || []).filter(t => !t.usedAt);

	return (
		<div style={{
			marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--rule)',
			display: 'flex', flexDirection: 'column', gap: 14,
		}}>
			<form onSubmit={onSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				<div style={labelStyle}>SET PASSWORD</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<input
						type="password"
						autoComplete="new-password"
						style={{ ...inputStyle, flex: 1 }}
						placeholder="New password (8+ chars)"
						value={password}
						onChange={e => setPassword(e.target.value)}
					/>
					<button type="submit" style={btnPrimary} disabled={setPasswordMutation.isPending || password.length < 8}>
						{setPasswordMutation.isPending ? 'Saving…' : 'Set'}
					</button>
				</div>
				{pwError && <div style={{ padding: '6px 10px', borderRadius: 'var(--r-md)', background: '#fdecea', color: '#a02323', fontSize: 12 }}>{pwError}</div>}
				{pwMessage && <div style={{ padding: '6px 10px', borderRadius: 'var(--r-md)', background: 'var(--river-50)', color: 'var(--river-800)', fontSize: 12 }}>{pwMessage}</div>}
			</form>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<div style={labelStyle}>ONE-TIME LOGIN LINK</div>
				{linkResult ? (
					<div style={{
						padding: '10px 12px',
						borderRadius: 'var(--r-md)',
						background: 'var(--river-50)',
						border: '1px solid var(--river-100)',
						display: 'flex',
						flexDirection: 'column',
						gap: 6,
					}}>
						<div style={{
							padding: '6px 8px',
							borderRadius: 'var(--r-sm)',
							background: 'var(--bg-card)',
							fontFamily: 'var(--font-mono)',
							fontSize: 11,
							wordBreak: 'break-all',
							color: 'var(--ink-1)',
							border: '1px solid var(--rule)',
						}}>{linkResult.url}</div>
						<div style={{ display: 'flex', gap: 8 }}>
							<button type="button" style={btnPrimary} onClick={onCopyLink}>{linkCopied ? 'Copied ✓' : 'Copy link'}</button>
							<button type="button" style={btnGhost} onClick={() => setLinkResult(null)}>Dismiss</button>
						</div>
					</div>
				) : (
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<button type="button" style={btnPrimary} onClick={() => createLinkMutation.mutate()} disabled={createLinkMutation.isPending}>
							{createLinkMutation.isPending ? 'Generating…' : 'Generate login link'}
						</button>
						<span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Expires in 24h, single-use.</span>
					</div>
				)}
				{linkError && <div style={{ padding: '6px 10px', borderRadius: 'var(--r-md)', background: '#fdecea', color: '#a02323', fontSize: 12 }}>{linkError}</div>}

				{activeTokens.length > 0 && (
					<div style={{ marginTop: 6 }}>
						<div style={{
							fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
							color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 4,
						}}>{activeTokens.length} active</div>
						{activeTokens.map(t => (
							<div key={t.id} style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								padding: '6px 8px',
								borderRadius: 'var(--r-sm)',
								border: '1px solid var(--rule)',
								background: 'var(--bg-card)',
								marginBottom: 4,
							}}>
								<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
									…{t.id.slice(-12)}
								</span>
								<button
									type="button"
									onClick={() => revokeMutation.mutate(t.id)}
									disabled={revokeMutation.isPending}
									style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}
								>Revoke</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
