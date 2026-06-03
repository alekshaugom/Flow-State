/**
 * Unobtrusive flag affordance for contributable entities.
 * Only rendered for logged-in members (capabilities.isMember).
 * Presents a reason picker (+ optional note) and calls POST /ContentFlagResource.
 * 409 → shows "Already flagged" instead of error.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';

interface FlagButtonProps {
	flaggedEntityType: string;
	flaggedEntityId: string;
	flaggedContributionId?: string | null;
}

const REASONS: { value: string; label: string }[] = [
	{ value: 'inaccurate', label: 'Inaccurate' },
	{ value: 'outdated',   label: 'Outdated' },
	{ value: 'harmful',    label: 'Harmful / dangerous' },
	{ value: 'duplicate',  label: 'Duplicate' },
	{ value: 'spam',       label: 'Spam' },
];

const btnFlag: React.CSSProperties = {
	background: 'none',
	border: 'none',
	cursor: 'pointer',
	color: 'var(--ink-4)',
	fontSize: 11,
	fontFamily: 'var(--font-mono)',
	letterSpacing: '0.06em',
	padding: '2px 4px',
	display: 'inline-flex',
	alignItems: 'center',
	gap: 4,
	borderRadius: 'var(--r-sm)',
	transition: 'color 0.12s',
};

const popoverStyle: React.CSSProperties = {
	position: 'absolute',
	zIndex: 100,
	bottom: 'calc(100% + 6px)',
	right: 0,
	width: 260,
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)',
	boxShadow: 'var(--shadow-card)',
	padding: '12px 14px',
	display: 'flex',
	flexDirection: 'column',
	gap: 10,
};

export function FlagButton({ flaggedEntityType, flaggedEntityId, flaggedContributionId }: FlagButtonProps) {
	const { capabilities, isAuthenticated } = useAuth();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState('');
	const [notes, setNotes] = useState('');
	const [done, setDone] = useState<'flagged' | 'dup' | null>(null);

	const flag = useMutation({
		mutationFn: () => api.submitFlag({
			flaggedEntityType,
			flaggedEntityId,
			flaggedContributionId: flaggedContributionId ?? undefined,
			reason,
			notes: notes.trim() || undefined,
		}),
		onSuccess: () => {
			setDone('flagged');
			setOpen(false);
			setReason('');
			setNotes('');
		},
		onError: (e: any) => {
			const msg: string = e?.message || '';
			if (msg.includes('409') || msg.toLowerCase().includes('already')) {
				setDone('dup');
			} else {
				setDone(null);
				// keep popover open so user sees the error
			}
			setOpen(false);
		},
	});

	// Not a member — show a muted hint only if authenticated (so guests see nothing)
	if (!isAuthenticated) return null;
	if (!capabilities?.isMember) {
		return (
			<span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
				Members can flag
			</span>
		);
	}

	if (done === 'flagged') {
		return (
			<span style={{ fontSize: 10, color: 'var(--green-600, #16a34a)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
				Flagged for review
			</span>
		);
	}

	if (done === 'dup') {
		return (
			<span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
				Already flagged
			</span>
		);
	}

	return (
		<span style={{ position: 'relative', display: 'inline-block' }}>
			<button
				type="button"
				style={btnFlag}
				title="Flag this entry"
				onClick={() => setOpen(v => !v)}
			>
				{/* Flag icon (simple SVG) */}
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
					<path d="M1.5 1v8M1.5 1.5h6l-1.5 3 1.5 3H1.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
				Flag
			</button>
			{open && (
				<>
					{/* Backdrop click-away */}
					<div
						style={{ position: 'fixed', inset: 0, zIndex: 99 }}
						onClick={() => { setOpen(false); setReason(''); setNotes(''); }}
					/>
					<div style={popoverStyle}>
						<div style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 10,
							letterSpacing: '0.10em',
							textTransform: 'uppercase',
							color: 'var(--ink-3)',
							fontWeight: 500,
						}}>
							FLAG THIS ENTRY
						</div>

						{/* Reason picker */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
							{REASONS.map(r => (
								<label key={r.value} style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									cursor: 'pointer',
									fontSize: 13,
									color: reason === r.value ? 'var(--ink-0)' : 'var(--ink-2)',
								}}>
									<input
										type="radio"
										name={`flag-reason-${flaggedEntityId}`}
										value={r.value}
										checked={reason === r.value}
										onChange={() => setReason(r.value)}
										style={{ accentColor: 'var(--river-600)' }}
									/>
									{r.label}
								</label>
							))}
						</div>

						{/* Optional note */}
						<textarea
							value={notes}
							onChange={e => setNotes(e.target.value)}
							placeholder="Additional notes (optional)"
							rows={2}
							style={{
								width: '100%',
								padding: '7px 10px',
								borderRadius: 'var(--r-md)',
								border: '1px solid var(--rule)',
								background: 'var(--bg-card)',
								color: 'var(--ink-0)',
								fontSize: 12,
								fontFamily: 'inherit',
								resize: 'vertical',
								boxSizing: 'border-box',
							}}
						/>

						{flag.isError && !flag.isPending && (
							<div style={{ fontSize: 11, color: '#a02323' }}>
								{(flag.error as any)?.message || 'Flag failed'}
							</div>
						)}

						<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
							<button
								type="button"
								onClick={() => { setOpen(false); setReason(''); setNotes(''); }}
								style={{
									padding: '6px 12px',
									borderRadius: 'var(--r-md)',
									border: '1px solid var(--rule)',
									background: 'var(--bg-card)',
									color: 'var(--ink-2)',
									fontSize: 12,
									cursor: 'pointer',
								}}
							>Cancel</button>
							<button
								type="button"
								disabled={!reason || flag.isPending}
								onClick={() => flag.mutate()}
								style={{
									padding: '6px 12px',
									borderRadius: 'var(--r-md)',
									border: '1px solid var(--river-700)',
									background: reason ? 'var(--river-700)' : 'var(--bg-sunken)',
									color: reason ? '#fff' : 'var(--ink-3)',
									fontSize: 12,
									fontWeight: 600,
									cursor: reason ? 'pointer' : 'not-allowed',
									opacity: flag.isPending ? 0.6 : 1,
								}}
							>
								{flag.isPending ? 'Flagging…' : 'Submit flag'}
							</button>
						</div>
					</div>
				</>
			)}
		</span>
	);
}
