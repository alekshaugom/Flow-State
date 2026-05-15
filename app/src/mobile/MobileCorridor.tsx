import { useCorridor } from '../hooks/useCorridor';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';

interface MobileCorridorProps {
	slug: string;
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

export function MobileCorridor({ slug }: MobileCorridorProps) {
	const { data, isLoading, error } = useCorridor(slug);

	if (error) {
		return <div style={{ padding: 24, color: 'var(--danger-solid)' }}>Failed to load corridor.</div>;
	}

	const corridor = data?.corridor;
	const sections: any[] = data?.sections || [];
	const breadcrumb = data?.breadcrumb || [];

	return (
		<div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', padding: '14px 16px 28px', gap: 14, fontFamily: 'var(--font-sans)' }}>
			<Breadcrumb segments={breadcrumb} />
			<div>
				<div style={eyebrow}>Corridor · {corridor?.driver || 'mixed'}</div>
				<h1 style={{ margin: '2px 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-0)' }}>
					{isLoading ? <Skeleton width={220} height={22} /> : (corridor?.name || slug)}
				</h1>
				{corridor?.description && (
					<p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>
						{corridor.description}
					</p>
				)}
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{isLoading ? (
					[1, 2, 3].map(i => <Skeleton key={i} height={64} borderRadius="var(--r-lg)" />)
				) : (
					sections.map((s: any) => <SectionRow key={s.id} section={s} density="mobile" />)
				)}
				{!isLoading && sections.length === 0 && (
					<div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
						No sections in this corridor yet.
					</div>
				)}
			</div>
		</div>
	);
}
