import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from './useAuth';
import type { UserProfileInput } from '../types';

export function useProfile() {
	const { user, isAuthenticated } = useAuth();
	const userId = user?.id;
	return useQuery({
		queryKey: ['profile', userId],
		queryFn: () => api.profile(userId as string),
		enabled: isAuthenticated && !!userId,
		staleTime: 60_000,
	});
}

export function useUpdateProfile() {
	const { user } = useAuth();
	const userId = user?.id;
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: UserProfileInput) => {
			if (!userId) throw new Error('Auth required');
			return api.updateProfile(userId, patch);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['profile', userId] });
			qc.invalidateQueries({ queryKey: ['me'] });
		},
	});
}
