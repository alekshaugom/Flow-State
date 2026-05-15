import { Link } from 'react-router-dom';
import { useWatershed } from '../hooks/useWatershed';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';
import { mapStatusToDesign } from '../constants';

interface MobileWatershedProps {
	slug: string;
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

const corridorCard: React.CSSProperties = {
	background: 'var(--bg-card)', border: '1px solid var(--rule)',
	borderRadius: 'var(--r-lg)', overflow: 'hidden',
	display: 'flex', flexDirection: 'column',
};

const mapHeaderPlaceholder: React.CSSProperties = {
	height: 72,
	background: 'linear-gradient(135deg, var(--bg-raised) 0%, var(--bg-sunken) 100%)',
	borderBottom: '1px solid var(--rule)',
	display: 'flex', alignItems: 'center', justifyContent: 'center',
	color: 'var(--ink-4)',
	fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em',
	textTransform: 'uppercase',
};

const corridorBody: React.CSSProperties = {
	padding: 14,
	display: 'flex', flexDirection: 'column', gap: 12,
};

export function MobileWatershed({ slug }: MobileWatershedProps) {
	const { data, isLoading, error } = useWatershed(slug);

	if (error) {
		return <div style={{ padding: 24, color: 'var(--danger-solid)' }}>Failed to load watershed.</div>;
	}

	const watershed = data?.watershed;
	const corridors: any[] = data?.corridors || [];
	const breadcrumb = data?.breadcrumb || [];

	return (
		<div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', padding: '14px 16px 28px', gap: 14, fontFamily: 'var(--font-sans)' }}>
			<Breadcrumb segments={breadcrumb} />
			<div>
				<div style={eyebrow}>Watershed</div>
				<h1 style={{ margin: '2px 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-0)' }}>
					{isLoading ? <Skeleton width={220} height={22} /> : (watershed?.name || slug)}
				</h1>
				{watershed?.description && (
					<p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>
						{watershed.description}
					</p>
				)}
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				{isLoading ? (
					[1, 2, 3].map(i => <Skeleton key={i} height={220} borderRadius="var(--r-lg)" />)
				) : (
					corridors.map(c => {
						const sections: any[] = c.sections || [];
						const runningCount = sections.filter((s: any) => {
							const ds = mapStatusToDesign(s.status);
							return ds === 'ideal' || ds === 'runnable' || ds === 'high';
						}).length;
						return (
							<article key={c.id} style={corridorCard}>
								<div style={mapHeaderPlaceholder}>
									<span>{'// '}Map · soon</span>
								</div>
								<div style={corridorBody}>
									<div>
										<div style={eyebrow}>Corridor · {c.driver || 'mixed'}</div>
										<h2 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--ink-0)' }}>{c.name}</h2>
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
										{sections.map((s: any) => (
											<SectionRow key={s.id} section={s} density="mobile" />
										))}
										{sections.length === 0 && (
											<div style={{ padding: 10, color: 'var(--ink-3)', fontSize: 12 }}>
												No sections in this corridor yet.
											</div>
										)}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
										<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
											{sections.length} section{sections.length === 1 ? '' : 's'} · {runningCount} running
										</span>
										<Link to={`/corridor/${c.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--river-600)', textDecoration: 'none' }}>
											View corridor →
										</Link>
									</div>
								</div>
							</article>
						);
					})
				)}
			</div>
		</div>
	);
}
