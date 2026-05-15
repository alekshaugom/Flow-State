import { useParams, Navigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { DesktopCorridor } from '../desktop/DesktopCorridor';
import { MobileCorridor } from '../mobile/MobileCorridor';

export function CorridorPage() {
	const { corridorSlug } = useParams<{ corridorSlug: string }>();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	if (!corridorSlug) return <Navigate to="/" replace />;
	return isDesktop
		? <DesktopCorridor slug={corridorSlug} />
		: <MobileCorridor slug={corridorSlug} />;
}
