import { ContributionBadge } from './ContributionBadge';
import { FlagButton } from './FlagButton';

export interface AccessPointData {
	id: string;
	name: string;
	altNames?: string | null;
	kind?: string | null;
	sortIndex?: number | null;
	latitude?: number | null;
	longitude?: number | null;
	riverMile?: number | null;
	fee?: string | null;
	vehicleAccess?: string | null;
	notes?: string | null;
	// Contributable fields (slice 21)
	directions?: string | null;
	permitRequired?: boolean | null;
	feeUsd?: number | null;
	parkingSpaces?: number | null;
	lastVerifiedAt?: string | null;
	verifiedBy?: string | null;
	currentContributionId?: string | null;
}

interface AccessPointCardProps {
	ap: AccessPointData;
}

const KIND_LABEL: Record<string, string> = {
	'put-in': 'Put-in',
	'take-out': 'Take-out',
	'both': 'Put-in / Take-out',
	'trailer_ramp': 'Trailer ramp',
	'slide_rails': 'Slide rails',
	'carry_in': 'Carry-in',
	'carry_out': 'Carry-out',
	'horse_pack_in': 'Horse pack-in',
	'fly_in': 'Fly-in',
	'other': 'Other',
};

function Chip({ children }: { children: React.ReactNode }) {
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

export function AccessPointCard({ ap }: AccessPointCardProps) {
	const kindLabel = ap.kind ? (KIND_LABEL[ap.kind] ?? ap.kind) : null;
	const hasProvenance = !!(ap.currentContributionId || ap.lastVerifiedAt);

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
					{kindLabel && (
						<div style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 10,
							letterSpacing: '0.12em',
							textTransform: 'uppercase',
							color: 'var(--river-600)',
							fontWeight: 500,
							marginBottom: 2,
						}}>
							{kindLabel}
						</div>
					)}
					<div style={{
						fontSize: 14,
						fontWeight: 600,
						color: 'var(--ink-0)',
						letterSpacing: '-0.005em',
						lineHeight: 1.3,
					}}>
						{ap.name}
					</div>
					{ap.altNames && (
						<div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
							aka {ap.altNames}
						</div>
					)}
				</div>
				{ap.riverMile != null && (
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--ink-3)',
						flexShrink: 0,
						letterSpacing: '0.04em',
					}}>
						mi {ap.riverMile.toFixed(1)}
					</div>
				)}
			</div>

			{/* Chips row */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{ap.directions && <Chip>Directions</Chip>}
				{ap.permitRequired && <Chip>Permit required</Chip>}
				{ap.feeUsd != null && ap.feeUsd > 0 && <Chip>${ap.feeUsd} fee</Chip>}
				{ap.feeUsd === 0 && <Chip>Free</Chip>}
				{ap.parkingSpaces != null && <Chip>{ap.parkingSpaces} spots</Chip>}
				{ap.vehicleAccess && <Chip>{ap.vehicleAccess}</Chip>}
			</div>

			{/* Directions text (if present) */}
			{ap.directions && (
				<div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
					{ap.directions}
				</div>
			)}

			{/* Notes */}
			{ap.notes && (
				<div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
					{ap.notes}
				</div>
			)}

			{/* Provenance + flag */}
			{hasProvenance && (
				<div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
					<ContributionBadge
						verificationState={ap.lastVerifiedAt ? 'verified' : 'pending'}
						lastVerifiedAt={ap.lastVerifiedAt}
						verifiedBy={ap.verifiedBy}
					/>
					<FlagButton
						flaggedEntityType="AccessPoint"
						flaggedEntityId={ap.id}
						flaggedContributionId={ap.currentContributionId}
					/>
				</div>
			)}
		</div>
	);
}
