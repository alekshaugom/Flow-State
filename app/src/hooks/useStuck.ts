import { useEffect, useRef, useState } from 'react';

/**
 * useStuck — detect when a sticky element has actually stuck to its top edge.
 *
 * Returns a ref to attach to the sticky element and a boolean that flips to
 * true when its top has reached the sticky offset. Implemented via an
 * IntersectionObserver on a 1px sentinel inserted just above the target — so
 * it works regardless of which ancestor is the scroll container.
 */
export function useStuck<T extends HTMLElement = HTMLDivElement>() {
	const ref = useRef<T | null>(null);
	const [stuck, setStuck] = useState(false);

	useEffect(() => {
		const el = ref.current;
		const parent = el?.parentElement;
		if (!el || !parent) return;

		const sentinel = document.createElement('div');
		sentinel.setAttribute('aria-hidden', 'true');
		sentinel.style.height = '1px';
		sentinel.style.pointerEvents = 'none';
		parent.insertBefore(sentinel, el);

		const obs = new IntersectionObserver(
			([entry]) => setStuck(!entry.isIntersecting),
			{ threshold: 0 },
		);
		obs.observe(sentinel);

		return () => {
			obs.disconnect();
			sentinel.remove();
		};
	}, []);

	return { ref, stuck } as const;
}
