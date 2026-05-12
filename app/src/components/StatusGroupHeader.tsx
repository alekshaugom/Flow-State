import { STATUS_COLORS, STATUS_LABEL, STATUS_BLURB, type DesignStatus } from '../constants';

interface StatusGroupHeaderProps {
	status: DesignStatus;
	count: number;
}

export function StatusGroupHeader({ status, count }: StatusGroupHeaderProps) {
	const c = STATUS_COLORS[status];
	return (
		<div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 4px 8px' }}>
			<span style={{ width: 8, height: 8, borderRadius: '50%', background: c.solid, transform: 'translateY(-2px)' }} />
			<span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>
				{STATUS_LABEL[status]}
			</span>
			<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
				{count} section{count === 1 ? '' : 's'}
			</span>
			<span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>
				{STATUS_BLURB[status]}
			</span>
		</div>
	);
}
