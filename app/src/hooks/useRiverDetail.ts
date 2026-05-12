import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { transformDetail } from '../lib/transform';
import type { DetailViewModel } from '../types';

export function useRiverDetail(sectionId: string | undefined) {
	return useQuery({
		queryKey: ['riverDetail', sectionId],
		queryFn: async (): Promise<DetailViewModel> => {
			const data = await api.riverDetail(sectionId!);
			return transformDetail(data);
		},
		enabled: !!sectionId,
		refetchInterval: 60_000,
	});
}
