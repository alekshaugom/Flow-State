import { Icon } from './Icon';

interface ContextStripProps {
	snowpackPct: number | null;
	damControlled: boolean;
	riverName: string;
	damDetails?: string;
	snowpack?: any[];
	reservoirs?: any[];
}

const contextCard: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 14,
};

const metricLabel: React.CSSProperties = {
	fontSize: 10, color: 'var(--ink-3)',
	textTransform: 'uppercase', letterSpacing: '0.06em',
	fontFamily: 'var(--font-mono)', fontWeight: 500,
};

const metricValue: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
	fontSize: 13, fontWeight: 600, color: 'var(--ink-0)',
};

const formatNum = (n: number | null | undefined, digits = 0): string => {
	if (n == null) return '—';
	return digits > 0 ? n.toFixed(digits) : Math.round(n).toLocaleString();
};

export function ContextStrip({ snowpackPct, damControlled, riverName, damDetails, snowpack, reservoirs }: ContextStripProps) {
	// Snowpack: pick the basin with the freshest latest reading (most basins return only one)
	const snowpackLatest = snowpack?.find(s => s.latest)?.latest;
	const snowpackBasin = snowpack?.find(s => s.latest)?.basin;

	// Reservoirs with actual data
	const reservoirsWithData = (reservoirs || []).filter((r: any) => r.latest && (r.latest.outflowCfs != null || r.latest.storageAcreFt != null || r.latest.elevationFt != null));

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
							{snowpackBasin ? `${snowpackBasin.name} basin` : `Upper ${riverName.split(' ')[0]} basin`} · SNOTEL avg
						</div>
						{snowpackLatest && (
							<div style={{
								marginTop: 10, paddingTop: 10,
								borderTop: '1px solid var(--rule)',
								display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
							}}>
								<div>
									<div style={metricLabel}>SWE</div>
									<div style={metricValue}>{formatNum(snowpackLatest.sweInches, 1)}<span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 400 }}>in</span></div>
								</div>
								<div>
									<div style={metricLabel}>Depth</div>
									<div style={metricValue}>{formatNum(snowpackLatest.snowDepthInches)}<span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 400 }}>in</span></div>
								</div>
								<div>
									<div style={metricLabel}>Precip</div>
									<div style={metricValue}>{formatNum(snowpackLatest.precipAccumInches, 1)}<span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 400 }}>in</span></div>
								</div>
							</div>
						)}
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
						{reservoirsWithData.length > 0 ? (
							<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
								{reservoirsWithData.map((r: any) => (
									<div key={r.reservoir.id} style={{
										paddingTop: 10,
										borderTop: '1px solid var(--rule)',
									}}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
											<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>{r.reservoir.name}</div>
											<div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
												{r.latest.timestamp ? new Date(r.latest.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : ''}
											</div>
										</div>
										<div style={{
											marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
										}}>
											<div>
												<div style={metricLabel}>Outflow</div>
												<div style={metricValue}>{formatNum(r.latest.outflowCfs)}<span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 400 }}>cfs</span></div>
											</div>
											<div>
												<div style={metricLabel}>Storage</div>
												<div style={metricValue}>{formatNum(r.latest.storageAcreFt)}<span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 400 }}>af</span></div>
											</div>
											<div>
												<div style={metricLabel}>Elev</div>
												<div style={metricValue}>{formatNum(r.latest.elevationFt)}<span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2, fontWeight: 400 }}>ft</span></div>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
								{damDetails || (damControlled
									? 'Upstream reservoir(s) on this corridor; release telemetry not currently available.'
									: 'No upstream control — flow is driven by snowmelt, precipitation, and tributary contribution.')}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
