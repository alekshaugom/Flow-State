import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { CorridorTileData } from '../components/CorridorTile';

interface CorridorTilesResponse {
	generated_at: string;
	tiles: CorridorTileData[];
}

export function useCorridorTiles() {
	return useQuery<CorridorTilesResponse>({
		queryKey: ['corridorTiles'],
		queryFn: () => api.corridorTiles(),
		refetchInterval: 5 * 60_000,
	});
}
