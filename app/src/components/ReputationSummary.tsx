/**
 * Shows a contributor's trust tier + reputation counts.
 * Prop userId omitted → own reputation.
 * Used in ProfileSetupPage (own) and AdminUsersPanel (per-user, alongside WalletPanel).
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { TrustBadge } from './TrustBadge';

interface ReputationSummaryProps {
	userId?: string;
}

const monoLabel: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase' as const,
	color: 'var(--ink-3)',
	fontWeight: 500,
};

const metricCard: React.CSSProperties = {
	padding: '10px 12px',
	borderRadius: 'var(--r-md)',
	background: 'var(--bg-raised)',
	border: '1px solid var(--rule)',
	display: 'flex',
	flexDirection: 'column',
	gap: 3,
	flex: '1 1 100px',
};

export function ReputationSummary({ userId }: ReputationSummaryProps) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['reputation', userId ?? 'me'],
		queryFn: () => api.getReputation(userId),
		staleTime: 60_000,
	});

	if (isLoading) {
		return <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--ink-3)' }}>Loading reputation…</div>;
	}

	if (error || !data) {
		return (
			<div style={{ padding: '10px 0', fontSize: 12, color: 'var(--red-600, #dc2626)' }}>
				{error ? String((error as Error).message) : 'Could not load reputation'}
			</div>
		);
	}

	const isBanned = !!data.bannedAt;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			{/* Tier row */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
				<TrustBadge tier={data.tier} />
				{isBanned && (
					<span style={{
						display: 'inline-flex',
						alignItems: 'center',
						padding: '3px 9px',
						borderRadius: 'var(--r-pill)',
						background: '#fef2f2',
						color: '#a02323',
						fontSize: 11,
						fontWeight: 600,
					}}>
						Banned
					</span>
				)}
				{data.manualTier && (
					<span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
						(admin-set)
					</span>
				)}
			</div>

			{/* Metrics grid */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
				<div style={metricCard}>
					<div style={monoLabel}>Accepted</div>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 18,
						fontWeight: 600,
						color: 'var(--green-700, #15803d)',
						letterSpacing: '-0.01em',
					}}>
						{data.acceptedContributions ?? 0}
					</div>
				</div>
				<div style={metricCard}>
					<div style={monoLabel}>Rejected</div>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 18,
						fontWeight: 600,
						color: data.rejectedContributions > 0 ? 'var(--red-600, #dc2626)' : 'var(--ink-3)',
						letterSpacing: '-0.01em',
					}}>
						{data.rejectedContributions ?? 0}
					</div>
				</div>
				<div style={metricCard}>
					<div style={monoLabel}>Flags recv.</div>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 18,
						fontWeight: 600,
						color: data.flagsReceived > 0 ? 'var(--amber-700, #b45309)' : 'var(--ink-3)',
						letterSpacing: '-0.01em',
					}}>
						{data.flagsReceived ?? 0}
					</div>
				</div>
				<div style={metricCard}>
					<div style={monoLabel}>Flags submitted</div>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 18,
						fontWeight: 600,
						color: 'var(--ink-2)',
						letterSpacing: '-0.01em',
					}}>
						{data.flagsSubmitted ?? 0}
					</div>
				</div>
			</div>

			{isBanned && (
				<div style={{
					padding: '8px 12px',
					borderRadius: 'var(--r-md)',
					background: '#fef2f2',
					border: '1px solid #fca5a5',
					fontSize: 11,
					color: '#a02323',
					fontFamily: 'var(--font-mono)',
				}}>
					Banned on {new Date(data.bannedAt!).toLocaleDateString()}
				</div>
			)}
		</div>
	);
}
