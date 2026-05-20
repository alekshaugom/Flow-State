import { Link } from 'react-router-dom';
import { RiverLogCard, type RiverLogCardThresholds } from './RiverLogCard';
import type { RiverLogEntry } from '../types';

interface PastTripsStripProps {
	sectionId: string;
	logs: RiverLogEntry[];
	totalCount: number;
	sectionThresholds?: RiverLogCardThresholds | null;
}

export function PastTripsStrip({ sectionId, logs, totalCount, sectionThresholds }: PastTripsStripProps) {
	const eyebrowText = totalCount > 0 ? `PAST TRIPS · ${totalCount} LOGGED` : 'LOG YOUR FIRST TRIP';

	return (
		<section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
			}}>
				<div style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 11,
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
					color: 'var(--ink-3)',
				}}>{eyebrowText}</div>
				<Link
					to={`/log/new?sectionId=${encodeURIComponent(sectionId)}`}
					style={{
						padding: '5px 10px',
						borderRadius: 'var(--r-pill)',
						border: '1px solid var(--river-700)',
						background: 'var(--river-700)',
						color: '#fff',
						textDecoration: 'none',
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.04em',
					}}
				>+ Log a trip</Link>
			</div>

			{logs.length > 0 ? (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{logs.map(log => (
						<RiverLogCard key={log.id} log={log} sectionThresholds={sectionThresholds} />
					))}
					{totalCount > logs.length && (
						<Link
							to={`/section/${encodeURIComponent(sectionId)}/logs`}
							style={{
								alignSelf: 'flex-start',
								fontFamily: 'var(--font-mono)',
								fontSize: 11,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								color: 'var(--river-700)',
								textDecoration: 'none',
								padding: '6px 4px',
							}}
						>See all {totalCount} trips →</Link>
					)}
				</div>
			) : (
				<div style={{
					padding: '14px 16px',
					borderRadius: 'var(--r-lg)',
					border: '1px dashed var(--rule)',
					background: 'var(--bg-tint)',
					color: 'var(--ink-3)',
					fontSize: 13,
				}}>
					No trips here yet. Logging one takes about a minute.
				</div>
			)}
		</section>
	);
}
