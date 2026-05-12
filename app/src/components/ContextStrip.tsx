import { Icon } from './Icon';

interface ContextStripProps {
	snowpackPct: number | null;
	damControlled: boolean;
	riverName: string;
	damDetails?: string;
}

const contextCard: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 14,
};

export function ContextStrip({ snowpackPct, damControlled, riverName, damDetails }: ContextStripProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			{/* Snowpack */}
			<div style={contextCard}>
				<div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
					<div style={{
						width: 40, height: 40, borderRadius: 'var(--r-md)',
						background: 'var(--bg-tint)', border: '1px solid var(--river-100)',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						color: 'var(--river-500)', flexShrink: 0,
					}}>
						<Icon name="snowflake" size={20} />
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
							<div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-0)' }}>Snowpack</div>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: (snowpackPct ?? 0) >= 100 ? 'var(--ideal-solid)' : 'var(--low-solid)', letterSpacing: '-0.02em' }}>
								{snowpackPct !== null ? snowpackPct : '—'}<span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 2 }}>% of normal</span>
							</div>
						</div>
						<div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'var(--bg-sunken)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', left: 0, top: 0, bottom: 0,
								width: `${Math.min(snowpackPct ?? 0, 150) / 150 * 100}%`,
								background: (snowpackPct ?? 0) >= 100 ? 'var(--ideal-solid)' : 'var(--low-solid)',
								borderRadius: 3,
							}} />
							<div style={{
								position: 'absolute', left: '66.67%', top: -3, bottom: -3, width: 1,
								background: 'var(--ink-3)',
							}} />
						</div>
						<div style={{ marginTop: 4, fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
							Upper {riverName.split(' ')[0]} basin · SNOTEL avg
						</div>
					</div>
				</div>
			</div>

			{/* Dam / release */}
			<div style={contextCard}>
				<div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
					<div style={{
						width: 40, height: 40, borderRadius: 'var(--r-md)',
						background: damControlled ? 'var(--bg-tint)' : 'var(--bg-sunken)',
						border: damControlled ? '1px solid var(--river-100)' : '1px solid var(--rule)',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						color: damControlled ? 'var(--river-500)' : 'var(--ink-4)', flexShrink: 0,
					}}>
						<Icon name="dam" size={20} />
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
							<div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-0)' }}>Dam release</div>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: damControlled ? 'var(--ink-1)' : 'var(--ink-3)' }}>
								{damControlled ? 'Active' : 'Free-flow'}
							</div>
						</div>
						<div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
							{damDetails || (damControlled
								? 'Currently managed release. Operator targets show steady contribution through 14-day window.'
								: 'No upstream control — flow is driven by snowmelt, precipitation, and tributary contribution.')}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
