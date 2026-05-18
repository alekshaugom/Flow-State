import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from './useAuth';
import type { UserCraftInput } from '../types';

export function useMyCrafts() {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['myCrafts'],
		queryFn: () => api.myCrafts(),
		enabled: isAuthenticated,
		staleTime: 60_000,
	});
}

export function useCraftMutations() {
	const qc = useQueryClient();

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ['myCrafts'] });
	};

	const create = useMutation({
		mutationFn: (input: UserCraftInput) => api.createCraft(input),
		onSuccess: invalidate,
	});

	const update = useMutation({
		mutationFn: ({ id, patch }: { id: string; patch: Partial<UserCraftInput> }) =>
			api.updateCraft(id, patch),
		onSuccess: invalidate,
	});

	const archive = useMutation({
		mutationFn: (id: string) => api.archiveCraft(id),
		onSuccess: invalidate,
	});

	const setDefault = useMutation({
		mutationFn: (id: string) => api.updateCraft(id, { isDefault: true }),
		onSuccess: invalidate,
	});

	return { create, update, archive, setDefault };
}
