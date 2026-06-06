import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

const EMPTY_SET = new Set<string>();

export function useFollows() {
	const qc = useQueryClient();

	const query = useQuery({
		queryKey: ['follows'],
		queryFn: () => api.myFollows(),
		staleTime: 60_000,
		// Always fetch — unauthenticated returns { authenticated: false, ... } with 200
	});

	const data = query.data;
	const corridorIds: Set<string> = data ? new Set(data.corridorIds) : EMPTY_SET;
	const sectionIds: Set<string> = data ? new Set(data.sectionIds) : EMPTY_SET;

	const toggle = useMutation({
		mutationFn: ({
			targetType,
			targetId,
			action,
		}: {
			targetType: 'corridor' | 'section';
			targetId: string;
			action?: 'toggle' | 'add' | 'remove';
		}) => api.toggleFollow(targetType, targetId, action),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['follows'] });
		},
	});

	return {
		isLoading: query.isLoading,
		authenticated: data?.authenticated ?? false,
		follows: data?.follows ?? [],
		corridorIds,
		sectionIds,
		isFollowingCorridor: (id: string) => corridorIds.has(id),
		isFollowingSection: (id: string) => sectionIds.has(id),
		toggle,
	};
}
