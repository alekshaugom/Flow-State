import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from './useAuth';

export function useMyLogsAggregate() {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['myLogsAggregate'],
		queryFn: () => api.myLogsAggregate(),
		enabled: isAuthenticated,
		staleTime: 30_000,
	});
}
