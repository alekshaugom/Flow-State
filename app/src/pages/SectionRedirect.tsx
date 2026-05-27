import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRiverDetail } from '../hooks/useRiverDetail';

/**
 * Redirects /section/:id → /corridor/{corridorSlug}?section={sectionId}
 *
 * Falls back gracefully if the section has no corridor in its breadcrumb
 * (e.g. orphaned sections) by navigating to / instead.
 */
export function SectionRedirect() {
	const { sectionId } = useParams<{ sectionId: string }>();
	const navigate = useNavigate();
	const { data, isLoading, error } = useRiverDetail(sectionId);

	useEffect(() => {
		if (!data || !sectionId) return;

		// Find the corridor entry in the breadcrumb: the segment whose href starts with '/corridor/'.
		const breadcrumb = data.breadcrumb ?? [];
		const corridorEntry = breadcrumb.find(seg => seg.href?.startsWith('/corridor/'));

		if (corridorEntry) {
			// Extract the corridor slug from the href: '/corridor/{slug}' → '{slug}'
			const corridorSlug = corridorEntry.href.replace('/corridor/', '');
			navigate(`/corridor/${corridorSlug}?section=${sectionId}`, { replace: true });
		} else {
			// No corridor in breadcrumb — fall back to root.
			navigate('/', { replace: true });
		}
	}, [data, sectionId, navigate]);

	if (error) {
		return <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>Redirecting…</div>;
	}

	if (isLoading || !data) {
		return <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>Loading…</div>;
	}

	// Render nothing while the navigate fires.
	return null;
}
