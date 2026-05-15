import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function useCorridor(slug: string | undefined) {
	return useQuery({
		queryKey: ['corridor', slug],
		queryFn: async () => api.corridor(slug!),
		enabled: !!slug,
		refetchInterval: 5 * 60_000,
	});
}
