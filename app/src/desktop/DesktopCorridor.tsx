import { useCorridor } from '../hooks/useCorridor';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { Skeleton } from '../components/Skeleton';
import { SectionRow } from '../components/SectionRow';

interface DesktopCorridorProps {
	slug: string;
}

const eyebrow: React.CSSProperties = {
	fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--river-600)',
	letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
};

export function DesktopCorridor({ slug }: DesktopCorridorProps) {
	const { data, isLoading, error } = useCorridor(slug);

	if (error) {
		return (
			<div style={{ width: '100%', height: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
				<AppHeader activePage="rivers" />
				<div style={{ padding: 40, textAlign: 'center', color: 'var(--danger-solid)' }}>
					Failed to load corridor.
				</div>
			</div>
		);
	}

	const corridor = data?.corridor;
	const sections: any[] = data?.sections || [];
	const breadcrumb = data?.breadcrumb || [];

	return (
		<div style={{ width: '100%', height: '100%', minHeight: 880, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: 'var(--ink-1)' }}>
			<AppHeader activePage="rivers" />

			<div style={{ padding: '20px 28px 8px' }}>
				<Breadcrumb segments={breadcrumb} />
			</div>

			<div style={{ padding: '0 28px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
				<div style={eyebrow}>
					Corridor · {corridor?.driver || 'mixed'}
				</div>
				<h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-0)' }}>
					{isLoading ? <Skeleton width={320} height={32} /> : (corridor?.name || slug)}
				</h1>
				{corridor?.description && (
					<p style={{ margin: '4px 0 0', maxWidth: 720, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
						{corridor.description}
					</p>
				)}
			</div>

			<div style={{ padding: '12px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 1000 }}>
				<div style={{ ...eyebrow, marginBottom: 4 }}>
					Sections · upstream → downstream
				</div>
				{isLoading ? (
					[1, 2, 3].map(i => <Skeleton key={i} height={72} borderRadius="var(--r-lg)" />)
				) : (
					sections.map((s: any) => <SectionRow key={s.id} section={s} density="desktop" />)
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
