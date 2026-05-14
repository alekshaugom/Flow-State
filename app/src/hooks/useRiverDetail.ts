import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../api';
import { transformDetail } from '../lib/transform';
import { useCraftSkill } from '../lib/craftContext';
import type { DetailViewModel } from '../types';

export function useRiverDetail(sectionId: string | undefined) {
	const { craft, skill } = useCraftSkill();
	const query = useQuery({
		queryKey: ['riverDetail', sectionId],
		queryFn: async () => api.riverDetail(sectionId!),
		enabled: !!sectionId,
		refetchInterval: 5 * 60_000,
	});

	const transformed = useMemo<DetailViewModel | undefined>(() => {
		if (!query.data) return undefined;
		return transformDetail(query.data, craft, skill);
	}, [query.data, craft, skill]);

	return { ...query, data: transformed };
}
