import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from './useAuth';

export function useSectionLogs(sectionId: string | undefined) {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['sectionLogs', sectionId],
		queryFn: () => api.sectionLogs(sectionId as string),
		enabled: isAuthenticated && !!sectionId,
		staleTime: 30_000,
	});
}
