import { ContributionBadge } from './ContributionBadge';
import { FlagButton } from './FlagButton';

export interface RapidData {
	id: string;
	name: string;
	slug?: string | null;
	riverMile?: number | null;
	latitude?: number | null;
	longitude?: number | null;
	classRating?: string | null;
	classByFlowJson?: string | null;
	linesJson?: string | null;
	hazardsJson?: string | null;
	scoutPortageNotes?: string | null;
	sortIndex?: number | null;
	lastVerifiedAt?: string | null;
	verifiedBy?: string | null;
	currentContributionId?: string | null;
}

interface RapidCardProps {
	rapid: RapidData;
}

// Class rating badge color map
const CLASS_COLORS: Record<string, { bg: string; fg: string }> = {
	'I':    { bg: 'var(--green-50, #f0fdf4)',  fg: 'var(--green-700, #15803d)' },
	'II':   { bg: 'var(--green-50, #f0fdf4)',  fg: 'var(--green-700, #15803d)' },
	'III':  { bg: 'var(--amber-50, #fffbeb)',  fg: 'var(--amber-700, #b45309)' },
	'III+': { bg: 'var(--amber-50, #fffbeb)',  fg: 'var(--amber-700, #b45309)' },
	'IV':   { bg: 'var(--orange-50, #fff7ed)', fg: 'var(--orange-700, #c2410c)' },
	'IV+':  { bg: 'var(--orange-50, #fff7ed)', fg: 'var(--orange-700, #c2410c)' },
	'V':    { bg: 'var(--red-50, #fef2f2)',    fg: 'var(--red-700, #b91c1c)' },
	'V+':   { bg: 'var(--red-50, #fef2f2)',    fg: 'var(--red-700, #b91c1c)' },
};

function ClassBadge({ rating }: { rating: string }) {
	// Normalize for lookup (e.g. "IV+" → base "IV+", or get fallback from base)
	const colors = CLASS_COLORS[rating] ??
		CLASS_COLORS[rating.replace(/[+-]$/, '')] ??
		{ bg: 'var(--bg-sunken)', fg: 'var(--ink-2)' };
	return (
		<span style={{
			display: 'inline-flex',
			alignItems: 'center',
			padding: '3px 10px',
			borderRadius: 'var(--r-pill)',
			background: colors.bg,
			color: colors.fg,
			fontFamily: 'var(--font-mono)',
			fontSize: 12,
			fontWeight: 700,
			letterSpacing: '0.04em',
			whiteSpace: 'nowrap',
			border: `1px solid ${colors.fg}22`,
		}}>
			Class {rating}
		</span>
	);
}

function InfoChip({ children }: { children: React.ReactNode }) {
	return (
		<span style={{
			display: 'inline-flex',
			alignItems: 'center',
			padding: '3px 9px',
			borderRadius: 'var(--r-pill)',
			background: 'var(--bg-sunken)',
			color: 'var(--ink-2)',
			border: '1px solid var(--rule)',
			fontFamily: 'var(--font-mono)',
			fontSize: 11,
			fontWeight: 500,
			whiteSpace: 'nowrap',
		}}>
			{children}
		</span>
	);
}

function parseSummary(json: string | null | undefined, max = 2): string[] {
	if (!json) return [];
	try {
		const arr = JSON.parse(json);
		if (!Array.isArray(arr)) return [];
		return arr.slice(0, max).map((item: any) => item.name ?? item.description ?? String(item)).filter(Boolean);
	} catch {
		return [];
	}
}

export function RapidCard({ rapid }: RapidCardProps) {
	const hasProvenance = !!(rapid.currentContributionId || rapid.lastVerifiedAt);
	const lineSummary = parseSummary(rapid.linesJson);
	const hazardSummary = parseSummary(rapid.hazardsJson);

	return (
		<div style={{
			background: 'var(--bg-card)',
			border: '1px solid var(--rule)',
			borderRadius: 'var(--r-lg)',
			padding: '12px 14px',
			boxShadow: 'var(--shadow-card)',
			display: 'flex',
			flexDirection: 'column',
			gap: 8,
		}}>
			{/* Header row */}
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
				<div style={{ minWidth: 0 }}>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						letterSpacing: '0.12em',
						textTransform: 'uppercase',
						color: 'var(--river-600)',
						fontWeight: 500,
						marginBottom: 2,
					}}>
						Rapid
					</div>
					<div style={{
						fontSize: 14,
						fontWeight: 600,
						color: 'var(--ink-0)',
						letterSpacing: '-0.005em',
						lineHeight: 1.3,
					}}>
						{rapid.name}
					</div>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
					{rapid.classRating && <ClassBadge rating={rapid.classRating} />}
					{rapid.riverMile != null && (
						<div style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 11,
							color: 'var(--ink-3)',
							letterSpacing: '0.04em',
						}}>
							mi {rapid.riverMile.toFixed(1)}
						</div>
					)}
				</div>
			</div>

			{/* Info chips */}
			{(lineSummary.length > 0 || hazardSummary.length > 0) && (
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
					{lineSummary.map((l, i) => <InfoChip key={`l${i}`}>Line: {l}</InfoChip>)}
					{hazardSummary.map((h, i) => <InfoChip key={`h${i}`}>Hazard: {h}</InfoChip>)}
				</div>
			)}

			{/* Scout / portage notes */}
			{rapid.scoutPortageNotes && (
				<div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
					<span style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						fontWeight: 600,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						color: 'var(--river-600)',
					}}>Scout / Portage — </span>
					{rapid.scoutPortageNotes}
				</div>
			)}

			{/* Provenance + flag */}
			{hasProvenance && (
				<div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
					<ContributionBadge
						verificationState={rapid.lastVerifiedAt ? 'verified' : 'pending'}
						lastVerifiedAt={rapid.lastVerifiedAt}
						verifiedBy={rapid.verifiedBy}
					/>
					<FlagButton
						flaggedEntityType="Rapid"
						flaggedEntityId={rapid.id}
						flaggedContributionId={rapid.currentContributionId}
					/>
				</div>
			)}
		</div>
	);
}
