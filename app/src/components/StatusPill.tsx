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
			fontSize: fs, fontWeight: 600, letterSpacing: 0.2,
			fontFamily: 'var(--font-sans)',
			lineHeight: 1,
		}}>
			<span style={{ width: 6, height: 6, borderRadius: '50%', background: c.solid }} />
			{label || STATUS_LABEL[status] || status}
		</span>
	);
}
