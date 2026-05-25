import { Icon } from '../components/Icon';

interface SummaryStatProps {
	label: string;
	value: number;
	color?: string;
	trendIcon?: 'up' | 'down';
	active?: boolean;
	onClick?: () => void;
}

export function SummaryStat({ label, value, color, trendIcon, active, onClick }: SummaryStatProps) {
	const clickable = !!onClick;
	const valueColor = active ? '#fff' : (color || 'var(--ink-0)');
	const labelColor = active ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)';

	return (
		<button
			onClick={onClick}
			type="button"
			disabled={!clickable}
			aria-pressed={clickable ? !!active : undefined}
			style={{
				padding: '12px 18px',
				borderRadius: 'var(--r-lg)',
				background: active ? 'var(--river-700)' : 'var(--bg-card)',
				border: active ? '1px solid var(--river-700)' : '1px solid var(--rule)',
				boxShadow: active ? '0 6px 20px rgba(31,81,124,0.30)' : 'var(--shadow-card)',
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				minWidth: 96,
				cursor: clickable ? 'pointer' : 'default',
				transition: 'background 120ms, box-shadow 120ms, border-color 120ms',
				textAlign: 'left',
				fontFamily: 'var(--font-sans)',
			}}
		>
			<div style={{
				fontSize: 10,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: labelColor,
				fontFamily: 'var(--font-mono)',
				fontWeight: 500,
			}}>{label}</div>
			<div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
				<span style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 26,
					fontWeight: 500,
					letterSpacing: '-0.02em',
					color: valueColor,
				}}>
					{value}
				</span>
				{trendIcon && (
					<Icon
						name={trendIcon === 'up' ? 'arrow-up' : 'arrow-down'}
						size={14}
						color={valueColor}
						strokeWidth={2.5}
					/>
				)}
			</div>
		</button>
	);
}
