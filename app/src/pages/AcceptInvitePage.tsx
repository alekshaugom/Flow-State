import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { SharePreviewResult } from '../types';

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTripDate(date: string, endDate: string | null): string {
	const start = parseYmd(date);
	if (!start) return date;
	const startStr = `${MONTHS[start.month - 1]} ${start.day}, ${start.year}`;
	if (!endDate || endDate === date) return startStr;
	const end = parseYmd(endDate);
	if (!end) return startStr;
	if (end.year === start.year) return `${MONTHS[start.month - 1]} ${start.day} → ${MONTHS[end.month - 1]} ${end.day}, ${end.year}`;
	return `${startStr} → ${MONTHS[end.month - 1]} ${end.day}, ${end.year}`;
}

function parseYmd(s: string): { year: number; month: number; day: number } | null {
	if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
	const [y, m, d] = s.split('-').map(p => parseInt(p, 10));
	if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;
	return { year: y, month: m, day: d };
}

export function AcceptInvitePage() {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [accepted, setAccepted] = useState(false);

	const preview = useQuery<SharePreviewResult>({
		queryKey: ['share-preview', token],
		queryFn: () => api.previewShare(token!),
		enabled: !!token,
		retry: false,
	});

	const consume = useMutation({
		mutationFn: () => api.consumeShare(token!),
		onSuccess: (result) => {
			setAccepted(true);
			qc.invalidateQueries({ queryKey: ['me'] });
			qc.invalidateQueries({ queryKey: ['my-logs'] });
			if (result.needsPasswordSetup) {
				navigate('/login/setup', { replace: true });
			} else {
				navigate(`/section/${encodeURIComponent(result.tripId.split('_')[1] || '')}/logs`, { replace: true });
			}
		},
	});

	if (!token) return <CardLayout><Status>Missing invite token.</Status></CardLayout>;

	if (preview.isLoading) return <CardLayout><Status>Loading invite…</Status></CardLayout>;

	if (preview.isError) {
		return (
			<CardLayout>
				<Status>{(preview.error as Error)?.message || 'This invite is no longer valid.'}</Status>
				<button style={btnSecondary} onClick={() => navigate('/')}>Go home</button>
			</CardLayout>
		);
	}

	const data = preview.data;
	if (!data) return null;

	const dateStr = formatTripDate(data.trip.date, data.trip.endDate);

	return (
		<CardLayout>
			<div style={{
				fontFamily: 'var(--font-mono)',
				fontSize: 11,
				letterSpacing: '0.12em',
				textTransform: 'uppercase',
				color: 'var(--ink-3)',
				marginBottom: 8,
			}}>// TRIP INVITE</div>

			<h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink-0)' }}>
				{data.inviter?.name || 'Someone'} invited you
			</h1>
			<div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 16 }}>
				to their trip on <strong>{data.trip.sectionName || 'a river section'}</strong>
				{' · '}
				<span style={{ color: 'var(--ink-3)' }}>{dateStr}</span>
			</div>

			<div style={{
				padding: '10px 12px',
				borderRadius: 'var(--r-md)',
				background: 'var(--bg-sunken)',
				color: 'var(--ink-2)',
				fontSize: 12,
				marginBottom: 20,
				lineHeight: 1.5,
			}}>
				Accepting will add you as a participant on this trip. You'll be able to add your own
				notes (and photos in a future update). The invite was sent to <strong>{data.share.inviteeEmail}</strong>.
			</div>

			{consume.isError && (
				<div style={{
					padding: '10px 12px',
					borderRadius: 'var(--r-md)',
					background: '#fdecea',
					color: '#a02323',
					fontSize: 13,
					marginBottom: 12,
				}}>{(consume.error as Error)?.message || 'Could not accept invite'}</div>
			)}

			<div style={{ display: 'flex', gap: 10 }}>
				<button
					style={btnPrimary}
					disabled={consume.isPending || accepted}
					onClick={() => consume.mutate()}
				>{consume.isPending ? 'Accepting…' : accepted ? 'Accepted' : 'Accept invite'}</button>
				<button style={btnSecondary} disabled={consume.isPending} onClick={() => navigate('/')}>Decline</button>
			</div>
		</CardLayout>
	);
}

function CardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div style={{
			width: '100%', minHeight: '100vh',
			background: 'var(--bg-app)',
			fontFamily: 'var(--font-sans)',
			display: 'flex', flexDirection: 'column', alignItems: 'center',
			justifyContent: 'center', padding: 20,
		}}>
			<div style={{
				maxWidth: 440, width: '100%',
				background: 'var(--bg-card)', border: '1px solid var(--rule)',
				borderRadius: 'var(--r-xl)', padding: '32px 28px',
				boxShadow: 'var(--shadow-card)',
			}}>
				{children}
			</div>
		</div>
	);
}

function Status({ children }: { children: React.ReactNode }) {
	return <div style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 12 }}>{children}</div>;
}

const btnPrimary: React.CSSProperties = {
	padding: '11px 20px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--river-700)',
	background: 'var(--river-700)',
	color: '#fff',
	fontWeight: 600,
	fontSize: 14,
	cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
	padding: '11px 18px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-1)',
	fontSize: 14,
	cursor: 'pointer',
};
