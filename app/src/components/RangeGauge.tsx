import type { Thresholds } from '../types';

interface RangeGaugeProps {
	currentFlow: number;
	thresholds: Thresholds;
}

export function RangeGauge({ currentFlow, thresholds: t }: RangeGaugeProps) {
	const totalMax = Math.max(t.high * 1.25, currentFlow * 1.12);
	const zones = [
		{ v: t.runnable, c: 'var(--low-solid)', label: 'Low' },
		{ v: t.idealLo,  c: 'var(--runnable-solid)', label: 'Run' },
		{ v: t.idealHi,  c: 'var(--ideal-solid)', label: 'Ideal' },
		{ v: t.high,     c: 'var(--high-solid)', label: 'High' },
		{ v: totalMax,   c: 'var(--danger-solid)', label: 'Danger' },
	];
	const segments: { from: number; to: number; c: string; label: string }[] = [];
	let prev = 0;
	zones.forEach(z => { segments.push({ from: prev, to: z.v, c: z.c, label: z.label }); prev = z.v; });
	const currentPct = (currentFlow / totalMax) * 100;

	return (
		<div style={{ marginTop: 20 }}>
			<div style={{ position: 'relative', height: 16, marginTop: 6, marginBottom: 6 }}>
				<div style={{
					height: '100%', borderRadius: 'var(--r-pill)', overflow: 'hidden',
					background: 'var(--bg-sunken)', border: '1px solid var(--rule)',
					display: 'flex',
				}}>
					{segments.map((s, i) => (
						<div key={i} style={{
							flex: (s.to - s.from),
							background: s.c, opacity: 0.85,
							borderRight: i < segments.length - 1 ? '1px solid rgba(255,255,255,0.4)' : 'none',
						}} />
					))}
				</div>
				<div style={{
					position: 'absolute', top: -6, bottom: -6, left: `${currentPct}%`,
					width: 3, background: 'var(--ink-0)',
					borderRadius: 2,
					boxShadow: '0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.2)',
					transform: 'translateX(-50%)',
				}} />
			</div>
			<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
				{segments.map((s, i) => (
					<span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
						{s.label}
					</span>
				))}
			</div>
			<div style={{
				display: 'flex', justifyContent: 'space-between', marginTop: 4,
				fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums',
			}}>
				<span>0</span>
				<span>{t.runnable.toLocaleString()}</span>
				<span>{t.idealLo.toLocaleString()}</span>
				<span>{t.idealHi.toLocaleString()}</span>
				<span>{t.high.toLocaleString()}</span>
				<span>{Math.round(totalMax).toLocaleString()}</span>
			</div>
		</div>
	);
}
