import { useMemo } from 'react';
import { BigCFS } from './BigCFS';
import { StatusPill } from './StatusPill';
import { Sparkline } from './Sparkline';
import { mapStatusToDesign, STATUS_LABEL } from '../constants';
import type { SpineSection } from './CorridorSpine';

interface SectionData {
	id: string;
	name: string;
	parentSectionId: string | null;
	sortIndex: number;
	difficulty: string;
	lengthMiles: number | null;
	primaryGaugeId: string | null;
	gaugeName: string | null;
	currentFlow: number | null;
	unit: string;
	trend: string;
	change24h: number | null;
	sparkline: number[];
	status: string;
	statusLabel: string | null;
	fromAccessPointId: string | null;
	toAccessPointId: string | null;
	corridorMileSpan: { startMile: number | null; endMile: number | null };
	putIn: string | null;
	takeOut: string | null;
	notes: string;
}

interface APData {
	id: string;
	name: string;
	altNames: string;
	kind: string;
	riverMile: number | null;
	fee: string | null;
	vehicleAccess: boolean | null;
	notes: string;
}

interface DamData {
	id: string;
	name: string;
	notes: string;
	riverMile: number | null;
}

interface GaugeData {
	id: string;
	name: string;
	currentFlow: number | null;
	unit: string;
	trend: string;
	change24h: number | null;
	sparkline: number[];
	updatedAt: string | null;
	riverMile: number | null;
}

interface CorridorSpineDetailPaneProps {
	sections: SectionData[];
	accessPoints: APData[];
	dams: DamData[];
	gauges: GaugeData[];
	activeSectionId: string | null;
	density?: 'desktop' | 'mobile';
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

const subtleNote: React.CSSProperties = {
	margin: '2px 0 0 0',
	fontSize: 12,
	fontStyle: 'italic',
	color: 'var(--ink-3)',
	lineHeight: 1.5,
};

export function CorridorSpineDetailPane({
	sections,
	accessPoints,
	dams,
	gauges,
	activeSectionId,
	density = 'desktop',
}: CorridorSpineDetailPaneProps) {
	const activeSection = useMemo(
		() => sections.find(s => s.id === activeSectionId) ?? null,
		[sections, activeSectionId],
	);

	const parentSection = useMemo(() => {
		if (!activeSection?.parentSectionId) return null;
		return sections.find(s => s.id === activeSection.parentSectionId) ?? null;
	}, [activeSection, sections]);

	// Pick the gauge for this section: prefer the section's primary gauge from the corridor's gauges list.
	const activeGauge = useMemo(() => {
		if (!activeSection) return null;
		if (activeSection.primaryGaugeId) {
			const g = gauges.find(g => g.id === activeSection.primaryGaugeId);
			if (g) return g;
		}
		// Fallback: synthesize a "snapshot" from the section's own readings
		return {
			id: activeSection.primaryGaugeId ?? 'unknown',
			name: activeSection.gaugeName ?? 'Primary gauge',
			currentFlow: activeSection.currentFlow,
			unit: activeSection.unit,
			trend: activeSection.trend,
			change24h: activeSection.change24h,
			sparkline: activeSection.sparkline,
			updatedAt: null,
			riverMile: null,
		};
	}, [activeSection, gauges]);

	// APs adjacent to the active section (between fromAccessPointId mile and toAccessPointId mile, ±0.5 mi buffer)
	const relevantAps = useMemo(() => {
		if (!activeSection) return [];
		const span = activeSection.corridorMileSpan;
		if (span.startMile === null || span.endMile === null) {
			// Fallback to just put-in / take-out IDs if mile spans aren't set
			return accessPoints.filter(ap =>
				ap.id === activeSection.fromAccessPointId || ap.id === activeSection.toAccessPointId);
		}
		const buffer = 0.5;
		return accessPoints.filter(ap =>
			ap.riverMile !== null
			&& ap.riverMile >= span.startMile! - buffer
			&& ap.riverMile <= span.endMile! + buffer,
		);
	}, [activeSection, accessPoints]);

	const relevantDam = useMemo(() => {
		if (!activeSection) return null;
		const span = activeSection.corridorMileSpan;
		if (span.startMile === null || span.endMile === null) return null;
		const found = dams.find(d =>
			d.riverMile !== null
			&& d.riverMile >= span.startMile! - 0.5
			&& d.riverMile <= span.endMile! + 5, // include the next-downstream dam within 5 mi
		);
		return found ?? null;
	}, [activeSection, dams]);

	if (!activeSection) {
		return (
			<div style={{
				padding: 16,
				color: 'var(--ink-3)',
				fontSize: 13,
				fontStyle: 'italic',
				border: '1px dashed var(--rule)',
				borderRadius: 'var(--r-lg)',
				background: 'var(--bg-card)',
			}}>
				Scroll the corridor or click a section to see details.
			</div>
		);
	}

	const design = mapStatusToDesign(activeSection.status);
	const statusLabel = activeSection.statusLabel ?? STATUS_LABEL[design] ?? design;

	return (
		<div style={{
			background: 'var(--bg-card)',
			border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)',
			padding: density === 'desktop' ? 20 : 14,
			display: 'flex',
			flexDirection: 'column',
			gap: density === 'desktop' ? 16 : 12,
			...(density === 'desktop' ? { position: 'sticky', top: 72 } : {}),
		}}>
			<div>
				<div style={eyebrow}>
					{parentSection ? `${parentSection.name} · sub-section` : 'Section'}
				</div>
				<h2 style={{
					margin: '2px 0 0',
					fontSize: density === 'desktop' ? 24 : 18,
					fontWeight: 700,
					letterSpacing: '-0.02em',
					color: 'var(--ink-0)',
				}}>
					{activeSection.name}
				</h2>
				<div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
					<StatusPill status={design} label={statusLabel} size={density === 'desktop' ? 'md' : 'sm'} />
					{activeSection.difficulty && (
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
							{activeSection.difficulty}
						</span>
					)}
					{activeSection.lengthMiles != null && (
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
							{activeSection.lengthMiles} mi
						</span>
					)}
				</div>
			</div>

			{activeGauge && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
					<div style={eyebrow}>
						Gauge · {activeGauge.name}
					</div>
					<BigCFS cfs={activeGauge.currentFlow !== null ? Math.round(activeGauge.currentFlow) : null} size="detail" />
					{activeGauge.sparkline && activeGauge.sparkline.length > 0 && (
						<Sparkline data={activeGauge.sparkline} status={design} width={density === 'desktop' ? 280 : 240} height={48} />
					)}
				</div>
			)}

			{relevantAps.length > 0 && (
				<div>
					<div style={eyebrow}>Access points</div>
					<ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
						{relevantAps.map(ap => (
							<li key={ap.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
									<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-1)' }}>{ap.name}</span>
									<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
										{ap.kind.replace('-', ' / ')}
									</span>
									{ap.riverMile !== null && (
										<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
											· mile {ap.riverMile.toFixed(1)}
										</span>
									)}
								</div>
								{ap.notes && <p style={subtleNote}>{ap.notes}</p>}
							</li>
						))}
					</ul>
				</div>
			)}

			{relevantDam && (
				<div style={{
					padding: 10,
					borderLeft: '3px solid var(--ink-1)',
					background: 'var(--bg-sunken)',
					borderRadius: 4,
				}}>
					<div style={eyebrow}>Impassable</div>
					<div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-1)', margin: '2px 0' }}>
						{relevantDam.name}
					</div>
					{relevantDam.notes && (
						<p style={{ ...subtleNote, fontStyle: 'normal', color: 'var(--ink-2)' }}>{relevantDam.notes}</p>
					)}
				</div>
			)}

			{activeSection.notes && (
				<div>
					<div style={eyebrow}>Notes</div>
					<p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>
						{activeSection.notes}
					</p>
				</div>
			)}
		</div>
	);
}
