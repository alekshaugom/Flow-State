import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import { RequireCapability } from './RequireCapability';
import { BountyStatusBadge } from './BountyStatusBadge';
import { EditContributionForm } from './EditContributionForm';
import { formatKarma } from '../lib/format';
import type { BountyListItem } from '../types';

// Entity types that have a fulfillable ContributionResource path.
// Mirrors lib/contributions/entity-registry.ts without importing server lib into the browser.
const FULFILLABLE_ENTITY_TYPES = ['access-point', 'rapid', 'shuttle-business', 'outfitter'] as const;

const cardStyle: React.CSSProperties = {
	padding: '14px 16px',
	borderRadius: 'var(--r-lg)',
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	display: 'flex',
	flexDirection: 'column',
	gap: 10,
};

const monoLabel: React.CSSProperties = {
	fontFamily: 'var(--font-mono)',
	fontSize: 10,
	letterSpacing: '0.10em',
	textTransform: 'uppercase' as const,
	color: 'var(--ink-3)',
	fontWeight: 500,
};

const btnStyle: React.CSSProperties = {
	padding: '5px 11px',
	borderRadius: 'var(--r-md)',
	border: '1px solid var(--rule)',
	background: 'var(--bg-card)',
	color: 'var(--ink-2)',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
};

const btnPrimary: React.CSSProperties = {
	...btnStyle,
	border: '1px solid var(--river-700)',
	background: 'var(--river-700)',
	color: '#fff',
};

const btnGreen: React.CSSProperties = {
	...btnStyle,
	border: '1px solid var(--green-600, #16a34a)',
	background: 'var(--green-600, #16a34a)',
	color: '#fff',
};

const btnDanger: React.CSSProperties = {
	...btnStyle,
	border: '1px solid #d99',
	color: '#a02323',
};

interface BountyCardProps {
	bounty: BountyListItem;
	/** If provided, invalidation after actions will include this corridor key */
	corridorSlug?: string;
	sectionId: string;
}

export function BountyCard({ bounty, corridorSlug, sectionId }: BountyCardProps) {
	const qc = useQueryClient();
	const { user } = useAuth();
	const [showSubmit, setShowSubmit] = useState(false);
	const [addingFunds, setAddingFunds] = useState(false);
	const [fundAmount, setFundAmount] = useState('');
	const [fundError, setFundError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const isOpen = bounty.status === 'open';
	const isPoster = user?.id && bounty.postedBy === user.id;

	function invalidate() {
		qc.invalidateQueries({ queryKey: ['riverDetail'] });
		qc.invalidateQueries({ queryKey: ['corridor'] });
		if (corridorSlug) qc.invalidateQueries({ queryKey: ['corridor', corridorSlug] });
	}

	// Lazy-load detail for award panel (fetched only by admins when needed)
	const [showAward, setShowAward] = useState(false);
	const detailQuery = useQuery({
		queryKey: ['bounty', bounty.id],
		queryFn: () => api.getBounty(bounty.id),
		enabled: showAward,
		staleTime: 15_000,
	});

	const addFundingMutation = useMutation({
		mutationFn: (amountCents: number) => api.addBountyFunding(bounty.id, amountCents),
		onSuccess: () => {
			setAddingFunds(false);
			setFundAmount('');
			setFundError(null);
			invalidate();
		},
		onError: (e: any) => setFundError(e?.message || 'Failed to add funding'),
	});

	const cancelMutation = useMutation({
		mutationFn: () => api.cancelBounty(bounty.id),
		onSuccess: () => {
			setError(null);
			invalidate();
		},
		onError: (e: any) => setError(e?.message || 'Failed to cancel bounty'),
	});

	const awardMutation = useMutation({
		mutationFn: (contributionId: string) => api.awardBounty(bounty.id, contributionId),
		onSuccess: () => {
			setShowAward(false);
			setError(null);
			invalidate();
			qc.invalidateQueries({ queryKey: ['bounty', bounty.id] });
		},
		onError: (e: any) => setError(e?.message || 'Failed to award bounty'),
	});

	const onAddFunds = () => {
		setFundError(null);
		// interim: integer holds karma points (slice 23b); becomes USD-cents when real payments land (slice 23)
		const karma = parseInt(fundAmount, 10);
		if (!karma || karma <= 0) { setFundError('Enter a positive karma amount'); return; }
		addFundingMutation.mutate(karma);
	};

	const contributions = detailQuery.data?.contributions ?? [];
	// Candidate contributions: those with bountyId === bounty.id
	const candidates = contributions.filter((c: any) => c.bountyId === bounty.id);

	return (
		<div style={cardStyle}>
			{/* Header row */}
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', lineHeight: 1.3, wordBreak: 'break-word' }}>
						{bounty.title || '(untitled bounty)'}
					</div>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
					{/* Pot — interim: integer holds karma points (slice 23b); becomes USD-cents when real payments land (slice 23) */}
					<span style={{
						fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
						color: 'var(--river-700)', letterSpacing: '-0.01em',
					}}>
						{formatKarma(bounty.escrowCents)}
					</span>
					<BountyStatusBadge status={bounty.status} />
				</div>
			</div>

			{/* Acceptance criteria */}
			{bounty.acceptanceCriteria && (
				<div>
					<div style={monoLabel}>Acceptance criteria</div>
					<div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>
						{bounty.acceptanceCriteria}
					</div>
				</div>
			)}

			{/* Actions */}
			{isOpen && (
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
					{/* Add to pot */}
					<RequireCapability capability="canFund">
						{!addingFunds ? (
							<button type="button" style={btnStyle} onClick={() => { setAddingFunds(true); setFundError(null); }}>
								+ Add to pot
							</button>
						) : (
							<div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
								<div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
									<span style={{ fontSize: 13, color: 'var(--ink-2)' }}>✦</span>
									<input
										type="number"
										min="1"
										step="1"
										value={fundAmount}
										onChange={e => setFundAmount(e.target.value)}
										placeholder="0"
										autoFocus
										style={{
											width: 80, padding: '4px 8px', borderRadius: 'var(--r-md)',
											border: '1px solid var(--rule)', background: 'var(--bg-card)',
											color: 'var(--ink-0)', fontSize: 13, fontFamily: 'var(--font-sans)',
										}}
									/>
								</div>
								<button
									type="button"
									style={{ ...btnPrimary, padding: '4px 10px', fontSize: 12 }}
									disabled={addFundingMutation.isPending}
									onClick={onAddFunds}
								>
									{addFundingMutation.isPending ? 'Adding…' : 'Add'}
								</button>
								<button type="button" style={{ ...btnStyle, padding: '4px 10px', fontSize: 12 }} onClick={() => { setAddingFunds(false); setFundAmount(''); setFundError(null); }}>
									Cancel
								</button>
								{fundError && <span style={{ fontSize: 11, color: 'var(--red-600, #dc2626)' }}>{fundError}</span>}
							</div>
						)}
					</RequireCapability>

					{/* Submit toward bounty */}
					<RequireCapability capability="canContribute">
						{!showSubmit && (
							<button type="button" style={btnPrimary} onClick={() => { setShowSubmit(true); setShowAward(false); }}>
								Submit work
							</button>
						)}
					</RequireCapability>

					{/* Award (admin) */}
					<RequireCapability capability="isAdmin">
						{!showAward && (
							<button type="button" style={btnGreen} onClick={() => { setShowAward(true); setShowSubmit(false); }}>
								Award
							</button>
						)}
					</RequireCapability>

					{/* Cancel (poster or admin) */}
					{(isPoster || true) && (
						<RequireCapability capability={isPoster ? 'canFund' : 'isAdmin'}>
							<button
								type="button"
								style={btnDanger}
								disabled={cancelMutation.isPending}
								onClick={() => {
									if (!window.confirm('Cancel this bounty? Funds will be refunded to contributors.')) return;
									cancelMutation.mutate();
								}}
							>
								{cancelMutation.isPending ? 'Cancelling…' : 'Cancel bounty'}
							</button>
						</RequireCapability>
					)}
				</div>
			)}

			{/* Submit toward bounty inline form */}
			{showSubmit && (
				<div style={{ marginTop: 6, padding: '12px 14px', background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)' }}>
					<div style={{ ...monoLabel, marginBottom: 10 }}>Submit work for this bounty</div>
					{bounty.entityType && (FULFILLABLE_ENTITY_TYPES as readonly string[]).includes(bounty.entityType) ? (
						<EditContributionForm
							entityType={bounty.entityType}
							entityId={bounty.entityId ?? null}
							op={bounty.entityId ? 'edit' : 'create'}
							bountyId={bounty.id}
							onDone={() => setShowSubmit(false)}
						/>
					) : (
						<div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
							Fulfillment for <strong>{bounty.entityType || 'this type'}</strong> opens in a later slice.
						</div>
					)}
				</div>
			)}

			{/* Award panel (admin) */}
			{showAward && (
				<div style={{ marginTop: 6, padding: '12px 14px', background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
						<div style={monoLabel}>Award bounty to contribution</div>
						<button type="button" onClick={() => setShowAward(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
					</div>
					{detailQuery.isLoading && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading contributions…</div>}
					{candidates.length === 0 && !detailQuery.isLoading && (
						<div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>No contributions linked to this bounty yet.</div>
					)}
					{candidates.map((c: any) => {
						const isSelf = user?.id && c.authorId === user.id;
						return (
							<div key={c.id} style={{
								display: 'flex', justifyContent: 'space-between', alignItems: 'center',
								gap: 10, padding: '8px 0', borderTop: '1px solid var(--rule)', flexWrap: 'wrap',
							}}>
								<div style={{ fontSize: 12, color: 'var(--ink-1)', minWidth: 0 }}>
									<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
										{c.id.slice(-8)}
									</span>
									{' '}by <strong>{c.authorId || 'unknown'}</strong>
									{c.verificationState && (
										<span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
											({c.verificationState})
										</span>
									)}
								</div>
								<button
									type="button"
									disabled={!!isSelf || awardMutation.isPending}
									title={isSelf ? 'Reviewer cannot approve own submission' : `Award bounty to this contribution`}
									style={{
										...btnGreen,
										opacity: isSelf ? 0.4 : 1,
										cursor: isSelf ? 'not-allowed' : 'pointer',
									}}
									onClick={() => {
										if (isSelf) return;
										if (!window.confirm('Award the bounty pot to this contribution? This is irreversible.')) return;
										awardMutation.mutate(c.id);
									}}
								>
									{awardMutation.isPending ? 'Awarding…' : 'Award'}
								</button>
							</div>
						);
					})}
				</div>
			)}

			{error && (
				<div style={{ fontSize: 12, color: 'var(--red-600, #dc2626)', marginTop: 4 }}>{error}</div>
			)}
		</div>
	);
}
