import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { MintShareResult, MyConnection } from '../types';

interface InviteParticipantFieldProps {
	tripId: string;
	onParticipantAdded?: () => void;
}

const labelStyle: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase',
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 6,
	display: 'block',
};

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '10px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-0)',
	fontSize: 14,
	fontFamily: 'inherit',
	boxSizing: 'border-box',
};

export function InviteParticipantField({ tripId, onParticipantAdded }: InviteParticipantFieldProps) {
	const qc = useQueryClient();
	const [email, setEmail] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [mintedLink, setMintedLink] = useState<MintShareResult | null>(null);
	const [copied, setCopied] = useState(false);

	const connections = useQuery<{ connections: MyConnection[]; total: number }>({
		queryKey: ['my-connections'],
		queryFn: () => api.myConnections(),
	});

	const mint = useMutation({
		mutationFn: (inviteeEmail: string) => api.mintShare(tripId, inviteeEmail),
		onSuccess: (result) => {
			setMintedLink(result);
			setError(null);
			setEmail('');
		},
		onError: (err: any) => setError(err?.message || 'Could not mint share link'),
	});

	const addExisting = useMutation({
		mutationFn: (userId: string) => api.addParticipant(tripId, userId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['my-logs'] });
			qc.invalidateQueries({ queryKey: ['section-logs'] });
			qc.invalidateQueries({ queryKey: ['river-detail'] });
			onParticipantAdded?.();
		},
		onError: (err: any) => setError(err?.message || 'Could not add participant'),
	});

	const onSubmitEmail = (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const trimmed = email.trim();
		if (!trimmed) return;
		mint.mutate(trimmed);
	};

	const copyLink = async () => {
		if (!mintedLink) return;
		try {
			await navigator.clipboard.writeText(mintedLink.url);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {}
	};

	const recents = (connections.data?.connections || []).slice(0, 6);

	return (
		<div style={{
			padding: 14,
			borderRadius: 'var(--r-lg)',
			border: '1px dashed var(--rule)',
			background: 'var(--bg-sunken)',
			display: 'flex',
			flexDirection: 'column',
			gap: 12,
		}}>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 11,
				letterSpacing: '0.12em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
			}}>// INVITE PARTICIPANTS</div>

			{recents.length > 0 && (
				<div>
					<div style={labelStyle}>From past trips</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
						{recents.map(c => (
							<button
								key={c.userId}
								type="button"
								onClick={(e) => { e.stopPropagation(); addExisting.mutate(c.userId); }}
								disabled={addExisting.isPending}
								style={{
									padding: '6px 10px',
									borderRadius: 'var(--r-pill)',
									border: '1px solid var(--rule)',
									background: 'var(--bg-card)',
									color: 'var(--ink-1)',
									fontSize: 12,
									cursor: 'pointer',
								}}
								title={c.email || undefined}
							>
								+ {c.name || c.email || c.userId}
								<span style={{ color: 'var(--ink-3)', marginLeft: 6, fontSize: 10 }}>{c.tripsTogetherCount}×</span>
							</button>
						))}
					</div>
				</div>
			)}

			<div>
				<div style={labelStyle}>By email — generates a personal invite link</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<input
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="friend@example.com"
						style={inputStyle}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								e.preventDefault();
								onSubmitEmail(e as any);
							}
						}}
					/>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onSubmitEmail(e as any); }}
						disabled={!email.trim() || mint.isPending}
						style={{
							padding: '10px 16px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--river-700)',
							background: 'var(--river-700)',
							color: '#fff',
							fontSize: 13,
							fontWeight: 600,
							cursor: 'pointer',
							whiteSpace: 'nowrap',
						}}
					>{mint.isPending ? 'Minting…' : 'Get link'}</button>
				</div>
			</div>

			{error && (
				<div style={{
					padding: '8px 10px',
					borderRadius: 'var(--r-md)',
					background: '#fdecea',
					color: '#a02323',
					fontSize: 12,
				}}>{error}</div>
			)}

			{mintedLink && (
				<div style={{
					padding: 12,
					borderRadius: 'var(--r-md)',
					background: 'var(--bg-card)',
					border: '1px solid var(--rule)',
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
				}}>
					<div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
						Send this link to <strong>{mintedLink.inviteeEmail}</strong>. Single-use, expires in 7 days.
					</div>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--ink-1)',
						background: 'var(--bg-sunken)',
						padding: '8px 10px',
						borderRadius: 'var(--r-sm)',
						wordBreak: 'break-all',
					}}>{mintedLink.url}</div>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); copyLink(); }}
						style={{
							alignSelf: 'flex-start',
							padding: '6px 12px',
							borderRadius: 'var(--r-md)',
							border: '1px solid var(--rule)',
							background: 'var(--bg-card)',
							color: 'var(--ink-1)',
							fontSize: 12,
							cursor: 'pointer',
						}}
					>{copied ? '✓ Copied' : 'Copy link'}</button>
				</div>
			)}
		</div>
	);
}
