/** Compact tier pill for a contributor — mirrors BountyStatusBadge styling. */

export type TrustTier = 'new' | 'established' | 'trusted' | 'moderator';

interface TrustBadgeProps {
	tier: TrustTier | string;
	size?: 'sm' | 'md';
}

function tierColors(tier: string): { bg: string; fg: string; dot: string } {
	switch (tier) {
		case 'moderator':
			return {
				bg: 'var(--accent-50, #faf5ff)',
				fg: 'var(--accent-700, #7e22ce)',
				dot: 'var(--accent-500, #a855f7)',
			};
		case 'trusted':
			return {
				bg: 'var(--green-50, #f0fdf4)',
				fg: 'var(--green-700, #15803d)',
				dot: 'var(--green-500, #22c55e)',
			};
		case 'established':
			return {
				bg: 'var(--river-50, #eff6ff)',
				fg: 'var(--river-700, #1d4ed8)',
				dot: 'var(--river-500, #3b82f6)',
			};
		case 'new':
		default:
			return {
				bg: 'var(--bg-sunken)',
				fg: 'var(--ink-3)',
				dot: 'var(--ink-4)',
			};
	}
}

const TIER_LABEL: Record<string, string> = {
	new: 'New',
	established: 'Established',
	trusted: 'Trusted',
	moderator: 'Moderator',
};

export function TrustBadge({ tier, size = 'md' }: TrustBadgeProps) {
	const { bg, fg, dot } = tierColors(tier);
	const padding = size === 'sm' ? '2px 7px' : '3px 9px';
	const fontSize = size === 'sm' ? 10 : 11;

	return (
		<span style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: 5,
			padding,
			borderRadius: 'var(--r-pill)',
			background: bg,
			color: fg,
			fontSize,
			fontWeight: 600,
			letterSpacing: 0.2,
			fontFamily: 'var(--font-sans)',
			lineHeight: 1,
		}}>
			<span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
			{TIER_LABEL[tier] ?? tier}
		</span>
	);
}
