import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { transformDashboard } from '../lib/transform';
import type { DashboardSection } from '../types';

export function useDashboard() {
	return useQuery({
		queryKey: ['dashboard'],
		queryFn: async (): Promise<{ sections: DashboardSection[]; generatedAt: string }> => {
			const data = await api.dashboard();
			return {
				sections: transformDashboard(data),
				generatedAt: data.generated_at,
			};
		},
		refetchInterval: 5 * 60_000,
	});
}
