import { useRiverDetail } from '../hooks/useRiverDetail';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionDetailBody } from '../components/SectionDetailBody';

interface DesktopDetailProps {
	sectionId: string;
}

export function DesktopDetail({ sectionId }: DesktopDetailProps) {
	const { data: detail, isLoading } = useRiverDetail(sectionId);

	if (isLoading || !detail) {
		return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading section data...</div>;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			{detail.breadcrumb && detail.breadcrumb.length > 0 && (
				<Breadcrumb segments={detail.breadcrumb} />
			)}
			<SectionDetailBody sectionId={sectionId} />
		</div>
	);
}
