import { Link } from 'react-router-dom';
import { useWatershed } from '../hooks/useWatershed';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';
import { mapStatusToDesign } from '../constants';

interface DesktopWatershedProps {
	slug: string;
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

const corridorCard: React.CSSProperties = {
	background: 'var(--bg-card)',
	border: '1px solid var(--rule)',
	borderRadius: 'var(--r-xl)',
	overflow: 'hidden',
	display: 'flex', flexDirection: 'column',
};

const mapHeaderPlaceholder: React.CSSProperties = {
	height: 96,
	background: 'linear-gradient(135deg, var(--bg-raised) 0%, var(--bg-sunken) 100%)',
	borderBottom: '1px solid var(--rule)',
	display: 'flex', alignItems: 'center', justifyContent: 'center',
	color: 'var(--ink-4)',
	fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
	textTransform: 'uppercase',
};

const corridorBody: React.CSSProperties = {
	padding: 18,
	display: 'flex', flexDirection: 'column', gap: 14,
};

export function DesktopWatershed({ slug }: DesktopWatershedProps) {
	const { data, isLoading, error } = useWatershed(slug);

	if (error) {
		return (
			<div style={{ width: '100%', height: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
				<AppHeader activePage="rivers" />
				<div style={{ padding: 40, textAlign: 'center', color: 'var(--danger-solid)' }}>
					Failed to load watershed.
				</div>
			</div>
		);
	}

	const watershed = data?.watershed;
	const corridors: any[] = data?.corridors || [];
	const breadcrumb = data?.breadcrumb || [];

	return (
		<div style={{ width: '100%', height: '100%', minHeight: 880, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: 'var(--ink-1)' }}>
			<AppHeader activePage="rivers" />

			<div style={{ padding: '20px 28px 8px' }}>
				<Breadcrumb segments={breadcrumb} />
			</div>

			<div style={{ padding: '0 28px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
				<div style={eyebrow}>
					<span style={{ color: 'var(--ink-4)' }}>{'// '}</span>
					Watershed
				</div>
				<h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
					{isLoading ? <Skeleton width={280} height={32} /> : (watershed?.name || slug)}
				</h1>
				{watershed?.description && (
					<p style={{ margin: '4px 0 0', maxWidth: 720, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
						{watershed.description}
					</p>
				)}
				{watershed?.dominantDriver && (
					<div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
						Driver · {watershed.dominantDriver}
					</div>
				)}
			</div>

			<div style={{ padding: '12px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1000 }}>
				{isLoading ? (
					[1, 2, 3].map(i => <Skeleton key={i} height={360} borderRadius="var(--r-xl)" />)
				) : (
					corridors.map(c => {
						const sections = c.sections || [];
						const runningCount = sections.filter((s: any) => {
							const ds = mapStatusToDesign(s.status);
							return ds === 'ideal' || ds === 'runnable' || ds === 'high';
						}).length;
						return (
							<article key={c.id} style={corridorCard}>
								<div style={mapHeaderPlaceholder}>
									<span>{'// '}Map · coming soon</span>
								</div>
								<div style={corridorBody}>
									<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
										<div style={{ minWidth: 0 }}>
											<div style={eyebrow}>Corridor · {c.driver || 'mixed'}</div>
											<h2 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--ink-0)', letterSpacing: '-0.015em' }}>
												{c.name}
											</h2>
											{c.description && (
												<p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', maxWidth: 640 }}>
													{c.description}
												</p>
											)}
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
											<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
												{sections.length} section{sections.length === 1 ? '' : 's'} · {runningCount} running
											</div>
											<Link to={`/corridor/${c.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--river-600)', textDecoration: 'none' }}>
												View corridor →
											</Link>
										</div>
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
										{sections.map((s: any) => (
											<SectionRow key={s.id} section={s} density="desktop" />
										))}
										{sections.length === 0 && (
											<div style={{ padding: 12, color: 'var(--ink-3)', fontSize: 13 }}>
												No sections in this corridor yet.
											</div>
										)}
									</div>
								</div>
							</article>
						);
					})
				)}
				{!isLoading && corridors.length === 0 && (
					<div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
						No corridors in this watershed yet.
					</div>
				)}
			</div>
		</div>
	);
}
