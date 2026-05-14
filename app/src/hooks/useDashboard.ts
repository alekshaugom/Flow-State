import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../api';
import { transformDashboard } from '../lib/transform';
import { useCraftSkill } from '../lib/craftContext';
import type { DashboardSection } from '../types';

export function useDashboard() {
	const { craft, skill } = useCraftSkill();
	const query = useQuery({
		queryKey: ['dashboard'],
		queryFn: async () => api.dashboard(),
		refetchInterval: 5 * 60_000,
	});

	const transformed = useMemo<{ sections: DashboardSection[]; generatedAt: string } | undefined>(() => {
		if (!query.data) return undefined;
		return {
			sections: transformDashboard(query.data, craft, skill),
			generatedAt: query.data.generated_at,
		};
	}, [query.data, craft, skill]);

	return { ...query, data: transformed };
}
