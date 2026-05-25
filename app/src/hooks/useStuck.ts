import { useEffect, useRef, useState } from 'react';

/**
 * useScrollProgress — return a 0→1 progress value as the sentinel (a 1px row
 * inserted just above the target element) approaches the sticky offset.
 *
 * progress = 0 while the sentinel is still `startDistance` or more below
 * `stickyOffset`, and = 1 once the sentinel has reached the offset (the title
 * is fully stuck). Use the value to interpolate styles like font-size, padding,
 * opacity etc. so the visual change is smooth and the layout never jumps
 * (which would otherwise re-trigger the observer and cause flicker).
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(
	stickyOffset = 64,
	startDistance = 120,
) {
	const ref = useRef<T | null>(null);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const el = ref.current;
		const parent = el?.parentElement;
		if (!el || !parent) return;

		// Sentinel marks the original (un-stuck) top of the sticky element.
		const sentinel = document.createElement('div');
		sentinel.setAttribute('aria-hidden', 'true');
		sentinel.style.height = '1px';
		sentinel.style.pointerEvents = 'none';
		parent.insertBefore(sentinel, el);

		let frame = 0;
		function compute() {
			frame = 0;
			const rect = sentinel.getBoundingClientRect();
			// Distance from sticky line. Positive = sentinel still below; 0 = at line.
			const dist = rect.top - stickyOffset;
			const p = Math.max(0, Math.min(1, (startDistance - dist) / startDistance));
			setProgress(prev => (Math.abs(prev - p) < 0.001 ? prev : p));
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
			sentinel.remove();
		};
	}, [stickyOffset, startDistance]);

	return { ref, progress } as const;
}

// Back-compat alias for any callers that just want a boolean.
export function useStuck<T extends HTMLElement = HTMLDivElement>() {
	const { ref, progress } = useScrollProgress<T>();
	return { ref, stuck: progress > 0.99 } as const;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Helper for interpolating numeric style values with the progress. */
export function lerpStyle(from: number, to: number, progress: number): number {
	return lerp(from, to, progress);
}
