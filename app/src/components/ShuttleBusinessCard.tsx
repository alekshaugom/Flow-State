import { ContributionBadge } from './ContributionBadge';
import { FlagButton } from './FlagButton';

export interface ShuttleBusinessData {
	id: string;
	name: string;
	slug?: string | null;
	phone?: string | null;
	website?: string | null;
	serviceCorridorIds?: string | null;
	ratesJson?: string | null;
	notes?: string | null;
	lastVerifiedAt?: string | null;
	verifiedBy?: string | null;
	currentContributionId?: string | null;
}

interface ShuttleBusinessCardProps {
	business: ShuttleBusinessData;
}

interface RateItem {
	label?: string;
	priceUsd?: number;
	notes?: string;
}

function parseRates(json: string | null | undefined, max = 3): RateItem[] {
	if (!json) return [];
	try {
		const arr = JSON.parse(json);
		if (!Array.isArray(arr)) return [];
		return arr.slice(0, max);
	} catch {
		return [];
	}
}

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

export function ShuttleBusinessCard({ business }: ShuttleBusinessCardProps) {
	const hasProvenance = !!(business.currentContributionId || business.lastVerifiedAt);
	const rates = parseRates(business.ratesJson);

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
						Shuttle
					</div>
					<div style={{
						fontSize: 14,
						fontWeight: 600,
						color: 'var(--ink-0)',
						letterSpacing: '-0.005em',
						lineHeight: 1.3,
					}}>
						{business.name}
					</div>
				</div>
			</div>

			{/* Contact chips */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{business.phone && (
					<a
						href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}
						style={{ textDecoration: 'none' }}
					>
						<Chip>{business.phone}</Chip>
					</a>
				)}
				{business.website && (
					<a
						href={business.website}
						target="_blank"
						rel="noopener noreferrer"
						style={{ textDecoration: 'none' }}
					>
						<Chip>Website</Chip>
					</a>
				)}
			</div>

			{/* Rates */}
			{rates.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<div style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						letterSpacing: '0.10em',
						textTransform: 'uppercase',
						color: 'var(--ink-3)',
						fontWeight: 500,
					}}>
						Rates
					</div>
					{rates.map((r, i) => (
						<div key={i} style={{
							fontSize: 12,
							color: 'var(--ink-2)',
							display: 'flex',
							justifyContent: 'space-between',
							gap: 8,
						}}>
							<span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								{r.label}
								{r.notes && (
									<span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>({r.notes})</span>
								)}
							</span>
							{r.priceUsd != null && (
								<span style={{
									fontFamily: 'var(--font-mono)',
									fontWeight: 600,
									color: 'var(--ink-1)',
									flexShrink: 0,
								}}>
									${r.priceUsd}
								</span>
							)}
						</div>
					))}
				</div>
			)}

			{/* Notes */}
			{business.notes && (
				<div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
					{business.notes}
				</div>
			)}

			{/* Provenance + flag */}
			{hasProvenance && (
				<div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
					<ContributionBadge
						verificationState={business.lastVerifiedAt ? 'verified' : 'pending'}
						lastVerifiedAt={business.lastVerifiedAt}
						verifiedBy={business.verifiedBy}
					/>
					<FlagButton
						flaggedEntityType="ShuttleBusiness"
						flaggedEntityId={business.id}
						flaggedContributionId={business.currentContributionId}
					/>
				</div>
			)}
		</div>
	);
}
