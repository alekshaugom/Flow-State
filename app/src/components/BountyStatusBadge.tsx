/** Compact status pill for a Bounty — mirrors ContributionBadge styling. */

type BountyStatus = 'open' | 'awarded' | 'settled' | 'cancelled' | 'expired';

interface BountyStatusBadgeProps {
	status: BountyStatus | string;
	size?: 'sm' | 'md';
}

function statusColors(status: string): { bg: string; fg: string; dot: string } {
	switch (status) {
		case 'open':
			return {
				bg: 'var(--river-50, #eff6ff)',
				fg: 'var(--river-700, #1d4ed8)',
				dot: 'var(--river-500, #3b82f6)',
			};
		case 'awarded':
		case 'settled':
			return {
				bg: 'var(--green-50, #f0fdf4)',
				fg: 'var(--green-700, #15803d)',
				dot: 'var(--green-500, #22c55e)',
			};
		case 'cancelled':
		case 'expired':
			return {
				bg: 'var(--bg-sunken)',
				fg: 'var(--ink-3)',
				dot: 'var(--ink-4)',
			};
		default:
			return {
				bg: 'var(--bg-sunken)',
				fg: 'var(--ink-3)',
				dot: 'var(--ink-4)',
			};
	}
}

const STATUS_LABEL: Record<string, string> = {
	open: 'Open',
	awarded: 'Awarded',
	settled: 'Settled',
	cancelled: 'Cancelled',
	expired: 'Expired',
};

export function BountyStatusBadge({ status, size = 'md' }: BountyStatusBadgeProps) {
	const { bg, fg, dot } = statusColors(status);
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
			{STATUS_LABEL[status] || status}
		</span>
	);
}
