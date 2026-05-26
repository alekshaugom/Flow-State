import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useActiveMile — track the river-mile under the viewport center while the user
 * scrolls past a vertical corridor spine.
 *
 * The hook attaches to the spine's outer wrapper. It listens to page-level
 * scroll (matching the existing sticky-title / page-scroll pattern) and computes:
 *
 *   activeMile = (viewportCenterY - spineTopWithinPage) / pixelsPerMile
 *
 * `scrollToMile(mile)` smoothly scrolls the page so the requested mile lands at
 * the viewport center.
 *
 * Returns `null` for activeMile until the spine's top has rendered (first frame).
 */
export function useActiveMile(opts: {
	totalMiles: number;
	pixelsPerMile: number;
	viewportCenterOffsetPx?: number;
}) {
	const { totalMiles, pixelsPerMile, viewportCenterOffsetPx } = opts;
	const ref = useRef<HTMLDivElement | null>(null);
	const [activeMile, setActiveMile] = useState<number | null>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		let frame = 0;
		function compute() {
			frame = 0;
			const current = ref.current;
			if (!current) return;
			const rect = current.getBoundingClientRect();
			const centerOffset = viewportCenterOffsetPx ?? window.innerHeight / 2;
			const positionInSpine = centerOffset - rect.top;
			const mile = positionInSpine / pixelsPerMile;
			const clamped = Math.max(0, Math.min(totalMiles, mile));
			setActiveMile(prev => (prev !== null && Math.abs(prev - clamped) < 0.005 ? prev : clamped));
		}

		function onScroll() {
			if (frame) return;
			frame = requestAnimationFrame(compute);
		}

		compute();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [totalMiles, pixelsPerMile, viewportCenterOffsetPx]);

	const scrollToMile = useCallback((mile: number) => {
		const el = ref.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const spineTopOnPage = rect.top + window.scrollY;
		const centerOffset = viewportCenterOffsetPx ?? window.innerHeight / 2;
		const targetScrollY = spineTopOnPage + mile * pixelsPerMile - centerOffset;
		window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
	}, [pixelsPerMile, viewportCenterOffsetPx]);

	return { ref, activeMile, scrollToMile } as const;
}
