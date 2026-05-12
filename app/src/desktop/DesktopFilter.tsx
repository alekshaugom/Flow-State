import { STATUS_COLORS, type DesignStatus } from '../constants';

interface DesktopFilterProps {
	label: string;
	count: number;
	status?: DesignStatus;
	active: boolean;
	onClick: () => void;
}

export function DesktopFilter({ label, count, status, active, onClick }: DesktopFilterProps) {
	const dot = status ? STATUS_COLORS[status].solid : null;
	return (
		<button onClick={onClick} style={{
			display: 'inline-flex', alignItems: 'center', gap: 8,
			padding: '8px 14px', borderRadius: 'var(--r-pill)',
			background: active ? 'var(--ink-0)' : 'var(--bg-card)',
			color: active ? 'white' : 'var(--ink-1)',
			border: active ? '1px solid var(--ink-0)' : '1px solid var(--rule)',
			fontSize: 13, fontWeight: 600,
		}}>
			{dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />}
			{label}
			<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: active ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)' }}>{count}</span>
		</button>
	);
}
