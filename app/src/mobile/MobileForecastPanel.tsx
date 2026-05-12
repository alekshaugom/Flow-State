import { STATUS_COLORS } from '../constants';
import { ForecastBand } from '../components/ForecastBand';
import type { DetailViewModel } from '../types';

interface MobileForecastPanelProps {
	detail: DetailViewModel;
}

export function MobileForecastPanel({ detail }: MobileForecastPanelProps) {
	const fc = detail.forecastBand;
	const c = STATUS_COLORS[detail.status];

	if (!fc || detail.history.length < 2) {
		return (
			<div style={{
				padding: 16, background: 'var(--bg-sunken)', borderRadius: 'var(--r-lg)',
				fontSize: 13, color: 'var(--ink-3)',
			}}>
				No forecast available. Trigger one from the admin page or API.
			</div>
		);
	}

	const last = fc.center[fc.center.length - 1];
	const delta = detail.now ? (last - detail.now) / detail.now : 0;
	const pct = Math.round(delta * 100);

	const verbal = (() => {
		const d = detail.forecastDirection;
		if (d === 'rising') return delta > 0.2 ? 'Likely rising' : 'Trending up';
		if (d === 'falling') return 'Dropping over the next two weeks';
		if (d === 'stable') return 'Stable, no major changes expected';
		if (d === 'volatile') return 'Volatile — daily swings ahead';
		if (d === 'peak') return 'Near peak, then easing back';
		return 'Forecast';
	})();

	const desc = (() => {
		const d = detail.forecastDirection;
		if (d === 'rising' && (detail.snowpackPct ?? 0) > 110) return `Modeled rise of ${pct}% over 14 days driven by above-normal snowpack (${detail.snowpackPct}%) and warming temperatures.`;
		if (d === 'falling' && detail.damControlled) return `Release window closing. Expect ${Math.abs(pct)}% drop into a sub-runnable state without a scheduled release.`;
		if (d === 'peak') return `Snowmelt nearing maximum contribution. Model places peak within 5–7 days, then decline.`;
		if (d === 'volatile') return `High-elevation snow at the freeze/thaw line — daily swings of 15–25% likely. Check before launching.`;
		if (d === 'stable' && detail.damControlled) return `Dam-controlled release holding steady. Operator schedule unchanged through the 14-day window.`;
		return `Confidence band reflects 80% likely range based on snowpack, temperature, and recent flow.`;
	})();

	return (
		<div style={{
			background: 'var(--bg-card)', border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)', padding: 16,
			display: 'flex', flexDirection: 'column', gap: 14,
		}}>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
				<div>
					<div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.01em' }}>{verbal}</div>
					<div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
				</div>
				<div style={{
					padding: '6px 10px', borderRadius: 'var(--r-md)',
					background: c.bg, color: c.fg,
					fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
					flexShrink: 0,
				}}>
					{pct > 0 ? '+' : ''}{pct}%
				</div>
			</div>
			<ForecastBand history={detail.history.slice(-30)} forecast={fc} width={326} height={110} status={detail.status} />
			<div style={{
				display: 'flex', justifyContent: 'space-between',
				fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em',
			}}>
				<span>30d history</span>
				<span style={{ color: 'var(--ink-4)' }}>· now ·</span>
				<span>14d forecast</span>
			</div>
		</div>
	);
}
