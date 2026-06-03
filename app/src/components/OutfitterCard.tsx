import { ContributionBadge } from './ContributionBadge';
import { FlagButton } from './FlagButton';

export interface OutfitterData {
	id: string;
	name: string;
	slug?: string | null;
	licenseNumber?: string | null;
	licenseState?: string | null;
	phone?: string | null;
	website?: string | null;
	serviceCorridorIds?: string | null;
	tripTypesJson?: string | null;
	notes?: string | null;
	lastVerifiedAt?: string | null;
	verifiedBy?: string | null;
	currentContributionId?: string | null;
}

interface OutfitterCardProps {
	outfitter: OutfitterData;
}

function parseTripTypes(json: string | null | undefined, max = 4): string[] {
	if (!json) return [];
	try {
		const arr = JSON.parse(json);
		if (!Array.isArray(arr)) return [];
		return arr.slice(0, max).map(String).filter(Boolean);
	} catch {
		return [];
	}
}

const TRIP_TYPE_LABELS: Record<string, string> = {
	'half-day': 'Half-day',
	'full-day': 'Full-day',
	'overnight': 'Overnight',
	'multi-day': 'Multi-day',
	'extreme': 'Extreme',
	'kayak-instruction': 'Kayak instruction',
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

export function OutfitterCard({ outfitter }: OutfitterCardProps) {
	const hasProvenance = !!(outfitter.currentContributionId || outfitter.lastVerifiedAt);
	const tripTypes = parseTripTypes(outfitter.tripTypesJson);

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
						Outfitter
					</div>
					<div style={{
						fontSize: 14,
						fontWeight: 600,
						color: 'var(--ink-0)',
						letterSpacing: '-0.005em',
						lineHeight: 1.3,
					}}>
						{outfitter.name}
					</div>
				</div>
				{/* License badge */}
				{outfitter.licenseNumber && (
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						color: 'var(--ink-3)',
						letterSpacing: '0.04em',
						flexShrink: 0,
						whiteSpace: 'nowrap',
					}}>
						{outfitter.licenseState ? `${outfitter.licenseState} ` : ''}{outfitter.licenseNumber}
					</div>
				)}
			</div>

			{/* Trip types */}
			{tripTypes.length > 0 && (
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
					{tripTypes.map(t => (
						<Chip key={t}>{TRIP_TYPE_LABELS[t] ?? t}</Chip>
					))}
				</div>
			)}

			{/* Contact chips */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{outfitter.phone && (
					<a
						href={`tel:${outfitter.phone.replace(/[^+\d]/g, '')}`}
						style={{ textDecoration: 'none' }}
					>
						<Chip>{outfitter.phone}</Chip>
					</a>
				)}
				{outfitter.website && (
					<a
						href={outfitter.website}
						target="_blank"
						rel="noopener noreferrer"
						style={{ textDecoration: 'none' }}
					>
						<Chip>Website</Chip>
					</a>
				)}
			</div>

			{/* Notes */}
			{outfitter.notes && (
				<div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
					{outfitter.notes}
				</div>
			)}

			{/* Provenance + flag */}
			{hasProvenance && (
				<div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
					<ContributionBadge
						verificationState={outfitter.lastVerifiedAt ? 'verified' : 'pending'}
						lastVerifiedAt={outfitter.lastVerifiedAt}
						verifiedBy={outfitter.verifiedBy}
					/>
					<FlagButton
						flaggedEntityType="Outfitter"
						flaggedEntityId={outfitter.id}
						flaggedContributionId={outfitter.currentContributionId}
					/>
				</div>
			)}
		</div>
	);
}
