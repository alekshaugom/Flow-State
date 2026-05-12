import { STATUS_COLORS, type DesignStatus } from '../constants';
import { Icon } from './Icon';
import { ForecastBand } from './ForecastBand';
import type { ForecastBandData } from '../types';

interface ForecastStripProps {
	forecastBand: ForecastBandData | null;
	forecastDirection: string;
	currentFlow: number | null;
	status: DesignStatus;
	history: number[];
	compact?: boolean;
}

export function ForecastStrip({ forecastBand, forecastDirection, currentFlow, status, history, compact = false }: ForecastStripProps) {
	if (!forecastBand || !currentFlow) {
		return (
			<div style={{
				display: 'flex', alignItems: 'center', gap: 8,
				padding: compact ? '8px 10px' : '10px 12px',
				background: 'var(--bg-sunken)',
				borderRadius: 'var(--r-md)',
				border: '1px solid var(--rule)',
				fontSize: 11, color: 'var(--ink-3)',
				fontFamily: 'var(--font-mono)',
			}}>
				No forecast available
			</div>
		);
	}

	const last = forecastBand.center[forecastBand.center.length - 1];
	const delta = (last - currentFlow) / currentFlow;
	const pct = Math.round(delta * 100);
	const verbal = (() => {
		if (forecastDirection === 'rising') return delta > 0.2 ? 'Likely rising' : 'Trending up';
		if (forecastDirection === 'falling') return 'Dropping soon';
		if (forecastDirection === 'stable') return 'Stable this week';
		if (forecastDirection === 'volatile') return 'Volatile, watch closely';
		if (forecastDirection === 'peak') return 'Near peak, then easing';
		return 'Forecast';
	})();
	const iconName = forecastDirection === 'rising' ? 'arrow-up'
		: forecastDirection === 'falling' ? 'arrow-down'
		: forecastDirection === 'volatile' ? 'wave' : 'arrow-right';

	const histSlice = history.slice(-30);

	return (
		<div style={{
			display: 'flex', alignItems: 'center', gap: 12,
			padding: compact ? '8px 10px' : '10px 12px',
			background: 'var(--bg-sunken)',
			borderRadius: 'var(--r-md)',
			border: '1px solid var(--rule)',
		}}>
			<div style={{
				flex: '0 0 auto',
				display: 'flex', alignItems: 'center', gap: 8,
				minWidth: compact ? 120 : 140,
			}}>
				<span style={{
					width: 28, height: 28, borderRadius: 8,
					display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					background: STATUS_COLORS[status].bg,
					color: STATUS_COLORS[status].solid,
				}}>
					<Icon name={iconName} size={16} strokeWidth={2.5} />
				</span>
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono)' }}>14-day forecast</span>
					<span style={{ fontSize: compact ? 12 : 13, color: 'var(--ink-1)', fontWeight: 600 }}>{verbal}</span>
				</div>
			</div>
			{histSlice.length > 1 && (
				<div style={{ flex: 1, minWidth: 0 }}>
					<ForecastBand history={histSlice} forecast={forecastBand} width={compact ? 140 : 180} height={32} status={status} />
				</div>
			)}
			<div style={{
				fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
				fontSize: 11, color: 'var(--ink-2)', textAlign: 'right' as const,
				flex: '0 0 auto', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 2,
			}}>
				<span style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>+14d</span>
				<span style={{ color: pct > 0 ? 'var(--trend-up)' : pct < 0 ? 'var(--trend-down)' : 'var(--ink-2)', fontWeight: 600 }}>
					{pct > 0 ? '+' : ''}{pct}%
				</span>
			</div>
		</div>
	);
}
