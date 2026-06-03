/** Compact provenance strip for a contributable entity. */

interface ContributionBadgeProps {
	verificationState?: string;
	verifiedBy?: string | null;
	lastVerifiedAt?: string | null;
	authorName?: string | null;
}

/** Maps a verificationState to background/foreground token pairs. */
function stateColors(state: string | undefined): { bg: string; fg: string; dot: string } {
	switch (state) {
		case 'verified':
			return { bg: 'var(--green-50, #f0fdf4)', fg: 'var(--green-700, #15803d)', dot: 'var(--green-500, #22c55e)' };
		case 'pending':
			return { bg: 'var(--amber-50, #fffbeb)', fg: 'var(--amber-700, #b45309)', dot: 'var(--amber-400, #fbbf24)' };
		case 'disputed':
		case 'rejected':
			return { bg: 'var(--bg-sunken)', fg: 'var(--ink-3)', dot: 'var(--ink-4)' };
		default:
			return { bg: 'var(--bg-sunken)', fg: 'var(--ink-3)', dot: 'var(--ink-4)' };
	}
}

function relativeDate(isoString: string): string {
	const ms = Date.now() - new Date(isoString).getTime();
	const days = Math.floor(ms / 86_400_000);
	if (days === 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(months / 12)}y ago`;
}

const STATE_LABEL: Record<string, string> = {
	verified: 'Verified',
	pending: 'Pending',
	disputed: 'Disputed',
	rejected: 'Rejected',
};

export function ContributionBadge({
	verificationState,
	verifiedBy,
	lastVerifiedAt,
	authorName,
}: ContributionBadgeProps) {
	if (!verificationState && !lastVerifiedAt) return null;

	const { bg, fg, dot } = stateColors(verificationState);
	const label = (verificationState && STATE_LABEL[verificationState]) ?? verificationState ?? 'Community';

	return (
		<div style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: 6,
			flexWrap: 'wrap',
		}}>
			{/* State pill */}
			<span style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 5,
				padding: '3px 8px',
				borderRadius: 'var(--r-pill)',
				background: bg,
				color: fg,
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: 0.2,
				fontFamily: 'var(--font-sans)',
				lineHeight: 1,
			}}>
				<span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
				{label}
			</span>

			{/* Relative date when verified */}
			{lastVerifiedAt && verificationState === 'verified' && (
				<span style={{
					fontSize: 11,
					color: 'var(--ink-3)',
					fontFamily: 'var(--font-mono)',
					letterSpacing: '0.04em',
				}}>
					{relativeDate(lastVerifiedAt)}
					{verifiedBy && <> · {verifiedBy}</>}
				</span>
			)}

			{/* Pending attribution */}
			{verificationState === 'pending' && authorName && (
				<span style={{
					fontSize: 11,
					color: 'var(--ink-3)',
					fontFamily: 'var(--font-mono)',
					letterSpacing: '0.04em',
				}}>
					by {authorName}
				</span>
			)}
		</div>
	);
}
