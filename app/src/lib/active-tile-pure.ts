/**
 * Pure math helpers for scroll-driven active-tile tracking.
 * No DOM, no React — easy to unit-test.
 */

export interface TileMeasurement {
	id: string;
	/** Tile's top edge in document coordinates (rect.top + window.scrollY) */
	topY: number;
	/** Tile's height in pixels */
	height: number;
	/** Section's start mile in corridor mile space */
	startMile: number;
	endMile: number;
}

export interface ActiveTileResult {
	activeSectionId: string | null;
	activeMile: number | null;
}

/**
 * Given a list of tile measurements and the current viewport-center Y in document coords,
 * find the tile whose vertical range contains the viewport center, then interpolate the
 * mile linearly within that tile.
 *
 * If no tile contains the viewport center, pick the nearest tile (closest by vertical
 * midpoint distance) and clamp to its endpoint mile.
 *
 * Returns null/null when the tiles array is empty.
 */
export function pickActiveTile(
	tiles: TileMeasurement[],
	viewportCenterY: number,
): ActiveTileResult {
	if (tiles.length === 0) {
		return { activeSectionId: null, activeMile: null };
	}

	// Try to find a tile that directly contains the viewport center.
	for (const tile of tiles) {
		if (viewportCenterY >= tile.topY && viewportCenterY <= tile.topY + tile.height) {
			const ratio = Math.max(0, Math.min(1, (viewportCenterY - tile.topY) / tile.height));
			const activeMile = tile.startMile + ratio * (tile.endMile - tile.startMile);
			return { activeSectionId: tile.id, activeMile };
		}
	}

	// No tile directly contains the viewport center — find nearest by midpoint distance.
	let nearest = tiles[0];
	let nearestDist = Math.abs((nearest.topY + nearest.height / 2) - viewportCenterY);

	for (let i = 1; i < tiles.length; i++) {
		const tile = tiles[i];
		const midY = tile.topY + tile.height / 2;
		const dist = Math.abs(midY - viewportCenterY);
		if (dist < nearestDist) {
			nearest = tile;
			nearestDist = dist;
		}
	}

	// Clamp activeMile to nearest tile's endpoint depending on which side the viewport is on.
	const nearestMidY = nearest.topY + nearest.height / 2;
	const activeMile = viewportCenterY < nearestMidY ? nearest.startMile : nearest.endMile;

	return { activeSectionId: nearest.id, activeMile };
}
