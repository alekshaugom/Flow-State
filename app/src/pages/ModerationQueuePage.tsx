/**
 * /moderation — Moderation queue for reviewers (admin || tier trusted/moderator).
 * Three sections: Pending contributions, Disputed contributions, Open flags.
 * Gate: redirect home if not canReview.
 */

import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { TrustBadge } from '../components/TrustBadge';
import { AppHeader } from '../components/AppHeader';

// ------------------------------------------------------------------
// Shared styles
// ------------------------------------------------------------------
const card: React.CSSProperties = {
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)',
	padding: '14px 16px',
	boxShadow: 'var(--shadow-card)',
	display: 'flex',
	flexDirection: 'column',
	gap: 10,
};

const sectionHead: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.12em',
	textTransform: 'uppercase' as const,
	color: 'var(--ink-3)',
	fontWeight: 500,
	marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
	padding: '6px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--green-700, #15803d)',
	background: 'var(--green-700, #15803d)',
	color: '#fff',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
	padding: '6px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid #d99',
	background: 'var(--bg-card)',
	color: '#a02323',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
	padding: '6px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-2)',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const btnAction: React.CSSProperties = {
	padding: '6px 12px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--amber-600, #d97706)',
	background: 'var(--bg-card)',
	color: 'var(--amber-700, #b45309)',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function relDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const ms = Date.now() - new Date(iso).getTime();
	const days = Math.floor(ms / 86_400_000);
	if (days === 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

function stateColor(state: string): string {
	switch (state) {
		case 'verified': return 'var(--green-700, #15803d)';
		case 'pending': return 'var(--amber-700, #b45309)';
		case 'disputed': return 'var(--orange-700, #c2410c)';
		case 'rejected': return 'var(--red-700, #b91c1c)';
		default: return 'var(--ink-3)';
	}
}

const REASON_LABEL: Record<string, string> = {
	inaccurate: 'Inaccurate',
	outdated: 'Outdated',
	harmful: 'Harmful / dangerous',
	duplicate: 'Duplicate',
	spam: 'Spam',
};

// ------------------------------------------------------------------
// Contribution row
// ------------------------------------------------------------------
function ContributionRow({
	contribution,
	callerUserId,
}: {
	contribution: any;
	callerUserId: string | undefined;
}) {
	const qc = useQueryClient();
	const isOwn = callerUserId && contribution.authorId === callerUserId;

	const verify = useMutation({
		mutationFn: (action: 'verify' | 'reject') =>
			api.verifyContribution(contribution.id, action),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['moderationQueue'] }),
	});

	const verifying = verify.isPending;
	const entityType = contribution.entityType ?? '—';
	const authorName = contribution.authorName ?? contribution.authorId?.slice(0, 8) ?? '—';
	const fieldsPreview = (() => {
		try {
			const f = JSON.parse(contribution.fieldsJson ?? '{}');
			const keys = Object.keys(f).slice(0, 3);
			return keys.length ? keys.join(', ') : '—';
		} catch { return '—'; }
	})();

	return (
		<div style={{
			...card,
			borderLeft: `3px solid ${stateColor(contribution.verificationState)}`,
		}}>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
				<div style={{ minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
						<span style={{
							display: 'inline-flex',
							padding: '2px 8px',
							borderRadius: 'var(--r-pill)',
							background: 'var(--bg-sunken)',
							color: stateColor(contribution.verificationState),
							fontSize: 10,
							fontWeight: 600,
							fontFamily: 'var(--font-mono)',
							letterSpacing: '0.08em',
						}}>
							{(contribution.verificationState ?? '—').toUpperCase()}
						</span>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
							{entityType} · {contribution.op ?? 'edit'}
						</span>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
							{relDate(contribution.createdAt)}
						</span>
					</div>
					<div style={{ fontSize: 13, color: 'var(--ink-0)', fontWeight: 500 }}>
						{contribution.entityId ?? 'new entity'}
					</div>
					<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
						Fields: {fieldsPreview}
					</div>
					{authorName && (
						<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
							by {authorName}
						</div>
					)}
				</div>

				<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
					{isOwn ? (
						<span style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
							(your submission)
						</span>
					) : (
						<>
							<button
								type="button"
								style={{ ...btnPrimary, opacity: verifying ? 0.6 : 1 }}
								disabled={verifying}
								onClick={() => verify.mutate('verify')}
							>
								Verify
							</button>
							<button
								type="button"
								style={{ ...btnDanger, opacity: verifying ? 0.6 : 1 }}
								disabled={verifying}
								onClick={() => verify.mutate('reject')}
							>
								Reject
							</button>
						</>
					)}
				</div>
			</div>

			{verify.isError && (
				<div style={{ fontSize: 11, color: '#a02323' }}>
					{(verify.error as any)?.message || 'Action failed'}
				</div>
			)}
		</div>
	);
}

// ------------------------------------------------------------------
// Flag row
// ------------------------------------------------------------------
function FlagRow({ flag }: { flag: any }) {
	const qc = useQueryClient();

	const review = useMutation({
		mutationFn: (disposition: 'dismiss' | 'action') =>
			api.reviewFlag(flag.id, disposition),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['moderationQueue'] }),
	});

	const reviewing = review.isPending;
	const reasonLabel = REASON_LABEL[flag.reason] ?? flag.reason;

	return (
		<div style={{ ...card, borderLeft: '3px solid var(--amber-400, #fbbf24)' }}>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
				<div style={{ minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
						<span style={{
							display: 'inline-flex',
							padding: '2px 8px',
							borderRadius: 'var(--r-pill)',
							background: 'var(--amber-50, #fffbeb)',
							color: 'var(--amber-700, #b45309)',
							fontSize: 10,
							fontWeight: 600,
							fontFamily: 'var(--font-mono)',
							letterSpacing: '0.08em',
						}}>
							{reasonLabel.toUpperCase()}
						</span>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
							{flag.flaggedEntityType}
						</span>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
							{relDate(flag.createdAt)}
						</span>
					</div>
					<div style={{ fontSize: 13, color: 'var(--ink-0)', fontWeight: 500 }}>
						{flag.flaggedEntityId}
					</div>
					{flag.flaggedContributionId && (
						<div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
							Contribution: {flag.flaggedContributionId.slice(0, 16)}…
						</div>
					)}
					{flag.notes && (
						<div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, fontStyle: 'italic' }}>
							"{flag.notes}"
						</div>
					)}
					<div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
						Reported by {flag.reportedBy?.slice(0, 10) ?? '—'}
					</div>
				</div>

				<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
					<button
						type="button"
						style={{ ...btnGhost, opacity: reviewing ? 0.6 : 1 }}
						disabled={reviewing}
						onClick={() => review.mutate('dismiss')}
					>
						Dismiss
					</button>
					<button
						type="button"
						style={{ ...btnAction, opacity: reviewing ? 0.6 : 1 }}
						disabled={reviewing}
						onClick={() => review.mutate('action')}
					>
						Action
					</button>
				</div>
			</div>

			{review.isError && (
				<div style={{ fontSize: 11, color: '#a02323' }}>
					{(review.error as any)?.message || 'Action failed'}
				</div>
			)}
		</div>
	);
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
export function ModerationQueuePage() {
	const navigate = useNavigate();
	const { capabilities, user, isLoading: authLoading } = useAuth();

	// Fetch caller's own reputation to check tier-based access
	const repQuery = useQuery({
		queryKey: ['reputation', 'me'],
		queryFn: () => api.getReputation(),
		staleTime: 60_000,
		enabled: !authLoading,
	});

	const callerTier: string = repQuery.data?.tier ?? 'new';
	const canReview =
		capabilities?.isAdmin ||
		callerTier === 'trusted' ||
		callerTier === 'moderator';

	const queueQuery = useQuery({
		queryKey: ['moderationQueue'],
		queryFn: api.getModerationQueue,
		staleTime: 15_000,
		enabled: canReview,
	});

	// Wait for auth + rep to resolve before gating
	if (authLoading || repQuery.isLoading) {
		return (
			<div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: 'var(--ink-3)' }}>
				Loading…
			</div>
		);
	}

	if (!canReview) {
		return (
			<div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
				<div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
				<h2 style={{ color: 'var(--ink-0)', marginBottom: 8 }}>Not authorized</h2>
				<p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>
					The moderation queue is available to admins, trusted contributors, and moderators.
				</p>
				<button
					type="button"
					onClick={() => navigate('/')}
					style={{ ...btnGhost, padding: '10px 20px' }}
				>
					Back home
				</button>
			</div>
		);
	}

	const queue = queueQuery.data;
	const pending = queue?.pendingContributions ?? [];
	const disputed = queue?.disputedContributions ?? [];
	const openFlags = queue?.openFlags ?? [];

	const isEmpty = pending.length === 0 && disputed.length === 0 && openFlags.length === 0;

	return (
		<div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
			<AppHeader activePage="admin" />

			<div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px', width: '100%', boxSizing: 'border-box' }}>
				{/* Page header */}
				<div style={{ marginBottom: 28 }}>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						letterSpacing: '0.12em',
						textTransform: 'uppercase',
						color: 'var(--ink-3)',
					}}>GOVERNANCE</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
						<h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--ink-0)' }}>
							Moderation Queue
						</h1>
						<TrustBadge tier={callerTier} />
					</div>
					{queue && (
						<div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
							{pending.length} pending · {disputed.length} disputed · {openFlags.length} open flags
						</div>
					)}
				</div>

				{queueQuery.isLoading && (
					<div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading queue…</div>
				)}

				{queueQuery.isError && (
					<div style={{
						padding: '12px 16px',
						borderRadius: 'var(--r-md)',
						background: '#fdecea',
						color: '#a02323',
						fontSize: 13,
						marginBottom: 16,
					}}>
						{(queueQuery.error as any)?.message || 'Failed to load moderation queue'}
					</div>
				)}

				{!queueQuery.isLoading && isEmpty && (
					<div style={{
						padding: '40px 20px',
						textAlign: 'center',
						color: 'var(--ink-3)',
						borderRadius: 'var(--r-lg)',
						border: '1px dashed var(--rule)',
					}}>
						<div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
						<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>Queue is clear</div>
						<div style={{ fontSize: 12, marginTop: 4 }}>No pending contributions or open flags.</div>
					</div>
				)}

				{/* Pending contributions */}
				{pending.length > 0 && (
					<div style={{ marginBottom: 32 }}>
						<div style={sectionHead}>Pending contributions ({pending.length})</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
							{pending.map((c: any) => (
								<ContributionRow key={c.id} contribution={c} callerUserId={user?.id} />
							))}
						</div>
					</div>
				)}

				{/* Disputed contributions */}
				{disputed.length > 0 && (
					<div style={{ marginBottom: 32 }}>
						<div style={sectionHead}>Disputed contributions ({disputed.length})</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
							{disputed.map((c: any) => (
								<ContributionRow key={c.id} contribution={c} callerUserId={user?.id} />
							))}
						</div>
					</div>
				)}

				{/* Open flags */}
				{openFlags.length > 0 && (
					<div style={{ marginBottom: 32 }}>
						<div style={sectionHead}>Open flags ({openFlags.length})</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
							{openFlags.map((f: any) => (
								<FlagRow key={f.id} flag={f} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
