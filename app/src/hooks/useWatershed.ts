import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function useWatershed(slug: string | undefined) {
	return useQuery({
		queryKey: ['watershed', slug],
		queryFn: async () => api.watershed(slug!),
		enabled: !!slug,
		refetchInterval: 5 * 60_000,
	});
}
