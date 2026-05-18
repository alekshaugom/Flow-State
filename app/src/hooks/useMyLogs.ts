import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from './useAuth';

export function useMyLogs(sectionId?: string) {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['myLogs', sectionId ?? 'all'],
		queryFn: () => api.myLogs(sectionId),
		enabled: isAuthenticated,
		staleTime: 30_000,
	});
}

export function useMyLog(id: string | undefined) {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['myLog', id],
		queryFn: () => api.myLog(id as string),
		enabled: isAuthenticated && !!id,
	});
}
