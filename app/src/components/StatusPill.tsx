import { STATUS_COLORS, STATUS_LABEL, type DesignStatus } from '../constants';

interface StatusPillProps {
	status: DesignStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
}

export function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
	const c = STATUS_COLORS[status];
	const padding = size === 'sm' ? '3px 8px' : size === 'lg' ? '7px 14px' : '5px 11px';
	const fs = size === 'sm' ? 11 : size === 'lg' ? 13 : 12;
	return (
		<span style={{
			display: 'inline-flex', alignItems: 'center', gap: 6,
			padding, borderRadius: 'var(--r-pill)',
			background: c.bg, color: c.fg,
			fontSize: fs, fontWeight: 700, letterSpacing: 0.1,
			fontFamily: 'var(--font-sans)',
			lineHeight: 1,
		}}>
			{label || STATUS_LABEL[status] || status}
		</span>
	);
}
