import { Icon } from '../components/Icon';

interface SummaryStatProps {
	label: string;
	value: number;
	color?: string;
	trendIcon?: 'up' | 'down';
	active?: boolean;
	onClick?: () => void;
	/** 0–1: shrink amount. 0 = full, 1 = compact (used while title is stuck). */
	progress?: number;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function SummaryStat({ label, value, color, trendIcon, active, onClick, progress = 0 }: SummaryStatProps) {
	const clickable = !!onClick;
	const valueColor = active ? '#fff' : (color || 'var(--ink-0)');
	const labelColor = active ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)';

	const padV = lerp(12, 6, progress);
	const padH = lerp(18, 12, progress);
	const minWidth = lerp(96, 78, progress);
	const valueSize = lerp(26, 18, progress);
	const labelSize = lerp(10, 9, progress);
	const gap = lerp(4, 2, progress);

	return (
		<button
			onClick={onClick}
			type="button"
			disabled={!clickable}
			aria-pressed={clickable ? !!active : undefined}
			style={{
				paddingTop: padV,
				paddingBottom: padV,
				paddingLeft: padH,
				paddingRight: padH,
				borderRadius: 'var(--r-lg)',
				background: active ? 'var(--river-700)' : 'var(--bg-card)',
				border: active ? '1px solid var(--river-700)' : '1px solid var(--rule)',
				boxShadow: active ? '0 6px 20px rgba(31,81,124,0.30)' : 'var(--shadow-card)',
				display: 'flex',
				flexDirection: 'column',
				gap,
				minWidth,
				cursor: clickable ? 'pointer' : 'default',
				textAlign: 'left',
				fontFamily: 'var(--font-sans)',
			}}
		>
			<div style={{
				fontSize: labelSize,
				letterSpacing: '0.10em',
				textTransform: 'uppercase',
				color: labelColor,
				fontFamily: 'var(--font-mono)',
				fontWeight: 500,
			}}>{label}</div>
			<div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
				<span style={{
					fontFamily: 'var(--font-mono)',
					fontSize: valueSize,
					fontWeight: 500,
					letterSpacing: '-0.02em',
					color: valueColor,
					lineHeight: 1,
				}}>
					{value}
				</span>
				{trendIcon && (
					<Icon
						name={trendIcon === 'up' ? 'arrow-up' : 'arrow-down'}
						size={lerp(14, 11, progress)}
						color={valueColor}
						strokeWidth={2.5}
					/>
				)}
			</div>
		</button>
	);
}
