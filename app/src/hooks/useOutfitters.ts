import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface Outfitter {
	id: string;
	name: string;
	phone: string | null;
	website: string | null;
	licenseNumber: string | null;
	licenseState: string | null;
	serviceCorridorIds: string | null;
	tripTypesJson: string | null;
	notes: string | null;
}

export function useOutfitters() {
	return useQuery<Outfitter[]>({
		queryKey: ['outfitters'],
		queryFn: () => api.outfitters(),
		staleTime: 5 * 60_000,
	});
}
