import { useCallback, useEffect, useRef, useState } from 'react';
import type { TileMeasurement, ActiveTileResult } from '../lib/active-tile-pure';
import { pickActiveTile } from '../lib/active-tile-pure';

interface TileEntry {
	el: HTMLElement;
	startMile: number;
	endMile: number;
}

export interface UseActiveTileApi {
	/**
	 * Stable ref callback factory. Returns a callback that registers/unregisters a tile by id.
	 * The returned callback is suitable to pass directly as a `ref` prop (tileRefCallback).
	 */
	registerTile: (id: string, startMile: number, endMile: number) => (el: HTMLDivElement | null) => void;
	activeSectionId: string | null;
	activeMile: number | null;
	/** Scroll the document so the tile with this id is centered in the viewport. */
	scrollToTile: (id: string) => void;
}

export function useActiveTile(): UseActiveTileApi {
	const registryRef = useRef<Map<string, TileEntry>>(new Map());
	const rafRef = useRef<number>(0);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

	const [result, setResult] = useState<ActiveTileResult>({
		activeSectionId: null,
		activeMile: null,
	});

	// Compute and update active tile from current registry.
	const recompute = useCallback(() => {
		rafRef.current = 0;
		const registry = registryRef.current;
		if (registry.size === 0) {
			setResult(prev =>
				prev.activeSectionId === null && prev.activeMile === null
					? prev
					: { activeSectionId: null, activeMile: null },
			);
			return;
		}

		const tiles: TileMeasurement[] = [];
		for (const [id, entry] of registry) {
			const rect = entry.el.getBoundingClientRect();
			tiles.push({
				id,
				topY: rect.top + window.scrollY,
				height: rect.height,
				startMile: entry.startMile,
				endMile: entry.endMile,
			});
		}

		const viewportCenterY = window.scrollY + window.innerHeight / 2;
		const next = pickActiveTile(tiles, viewportCenterY);

		setResult(prev => {
			if (prev.activeSectionId === next.activeSectionId && prev.activeMile === next.activeMile) {
				return prev;
			}
			return next;
		});
	}, []);

	// Schedule a recompute on the next animation frame (throttle scroll/resize).
	const requestRecompute = useCallback(() => {
		if (rafRef.current) return;
		rafRef.current = requestAnimationFrame(recompute);
	}, [recompute]);

	// Set up scroll listener and ResizeObserver once.
	useEffect(() => {
		const onScroll = () => requestRecompute();
		const onResize = () => requestRecompute();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize, { passive: true });

		// ResizeObserver watches all registered tile elements for expand/collapse.
		const ro = new ResizeObserver(() => requestRecompute());
		resizeObserverRef.current = ro;

		// Run once on mount to set initial state.
		requestRecompute();

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
			ro.disconnect();
			resizeObserverRef.current = null;
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = 0;
			}
		};
	}, [requestRecompute]);

	const registerTile = useCallback(
		(id: string, startMile: number, endMile: number) =>
			(el: HTMLDivElement | null) => {
				const registry = registryRef.current;
				const ro = resizeObserverRef.current;
				if (el) {
					registry.set(id, { el, startMile, endMile });
					if (ro) ro.observe(el);
				} else {
					const existing = registry.get(id);
					if (existing && ro) ro.unobserve(existing.el);
					registry.delete(id);
				}
				requestRecompute();
			},
		[requestRecompute],
	);

	const scrollToTile = useCallback((id: string) => {
		const entry = registryRef.current.get(id);
		if (!entry) return;
		const rect = entry.el.getBoundingClientRect();
		const midY = rect.top + window.scrollY + rect.height / 2;
		window.scrollTo({ top: midY - window.innerHeight / 2, behavior: 'smooth' });
	}, []);

	return {
		registerTile,
		activeSectionId: result.activeSectionId,
		activeMile: result.activeMile,
		scrollToTile,
	};
}
