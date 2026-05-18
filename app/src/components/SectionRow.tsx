import { Link } from 'react-router-dom';
import { Sparkline } from './Sparkline';
import { HomeCardLoggedBadge } from './HomeCardLoggedBadge';
import { STATUS_COLORS, mapStatusToDesign, STATUS_LABEL } from '../constants';

interface SectionShape {
	id: string;
	name: string;
	difficulty?: string;
	lengthMiles?: number;
	currentFlow?: number | null;
	unit?: string | null;
	status: string;
	sparkline?: number[] | null;
	putIn?: string | null;
	takeOut?: string | null;
	myTripCount?: number;
}

interface SectionRowProps {
	section: SectionShape;
	density?: 'desktop' | 'mobile';
}

const desktopCard: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 14,
	display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
	textDecoration: 'none', color: 'inherit',
};

const mobileCard: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', padding: 12,
	display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
	textDecoration: 'none', color: 'inherit',
};

export function SectionRow({ section, density = 'desktop' }: SectionRowProps) {
	const ds = mapStatusToDesign(section.status);
	const col = STATUS_COLORS[ds];
	const sparklineSize = density === 'mobile' ? { w: 64, h: 28 } : { w: 92, h: 32 };
	const cardStyle = density === 'mobile' ? mobileCard : desktopCard;
	const titleSize = density === 'mobile' ? 15 : 16;
	const flowSize = density === 'mobile' ? 18 : 20;

	return (
		<Link to={`/section/${section.id}`} style={{ ...cardStyle, position: 'relative' }}>
			<HomeCardLoggedBadge count={section.myTripCount ?? 0} />
			<div style={{ display: 'flex', flexDirection: 'column', gap: density === 'mobile' ? 4 : 6, minWidth: 0 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
					<span style={{
						display: 'inline-flex', alignItems: 'center', gap: 6,
						padding: '3px 8px', borderRadius: 'var(--r-pill)',
						background: col.bg, color: col.fg, border: `1px solid ${col.line}`,
						fontSize: 11, fontFamily: 'var(--font-mono)',
					}}>
						<span style={{ width: 6, height: 6, borderRadius: '50%', background: col.solid }} />
						{STATUS_LABEL[ds]}
					</span>
					<span style={{ fontSize: titleSize, fontWeight: 700, color: 'var(--ink-0)' }}>{section.name}</span>
					{(section.difficulty || section.lengthMiles) && (
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
							{section.difficulty ? `Class ${section.difficulty}` : ''}
							{section.lengthMiles ? ` · ${section.lengthMiles} mi` : ''}
						</span>
					)}
				</div>
				{density === 'desktop' && (section.putIn || section.takeOut) && (
					<div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
						{section.putIn}{section.putIn && section.takeOut ? ' → ' : ''}{section.takeOut}
					</div>
				)}
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: density === 'mobile' ? 12 : 16, flexShrink: 0 }}>
				{section.sparkline && section.sparkline.length > 0 && (
					<Sparkline data={section.sparkline} width={sparklineSize.w} height={sparklineSize.h} status={ds} />
				)}
				<div style={{ textAlign: 'right' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: flowSize, fontWeight: 700, color: 'var(--ink-0)', fontVariantNumeric: 'tabular-nums' }}>
						{section.currentFlow != null ? Math.round(section.currentFlow) : '—'}
					</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
						{section.unit || 'cfs'}
					</div>
				</div>
			</div>
		</Link>
	);
}
