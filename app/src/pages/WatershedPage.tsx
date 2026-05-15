import { useParams, Navigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { DesktopWatershed } from '../desktop/DesktopWatershed';
import { MobileWatershed } from '../mobile/MobileWatershed';

export function WatershedPage() {
	const { watershedSlug } = useParams<{ watershedSlug: string }>();
	const isDesktop = useMediaQuery('(min-width: 768px)');
	if (!watershedSlug) return <Navigate to="/" replace />;
	return isDesktop
		? <DesktopWatershed slug={watershedSlug} />
		: <MobileWatershed slug={watershedSlug} />;
}
