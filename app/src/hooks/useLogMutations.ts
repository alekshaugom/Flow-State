import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { RiverLogInput } from '../types';

function invalidateLogScope(qc: ReturnType<typeof useQueryClient>, sectionId?: string | null) {
	qc.invalidateQueries({ queryKey: ['myLogs'] });
	qc.invalidateQueries({ queryKey: ['sectionLogs', sectionId ?? undefined] });
	qc.invalidateQueries({ queryKey: ['riverDetail', sectionId] });
	qc.invalidateQueries({ queryKey: ['dashboard'] });
	qc.invalidateQueries({ queryKey: ['myLogsAggregate'] });
}

export function useLogMutations() {
	const qc = useQueryClient();

	const create = useMutation({
		mutationFn: (input: RiverLogInput) => api.createLog(input),
		onSuccess: (log) => invalidateLogScope(qc, log.sectionId),
	});

	const update = useMutation({
		mutationFn: ({ id, patch }: { id: string; patch: Partial<RiverLogInput> }) =>
			api.updateLog(id, patch),
		onSuccess: (log) => {
			invalidateLogScope(qc, log.sectionId);
			qc.invalidateQueries({ queryKey: ['myLog', log.id] });
		},
	});

	const remove = useMutation({
		mutationFn: ({ id, sectionId }: { id: string; sectionId?: string }) =>
			api.deleteLog(id).then(() => ({ id, sectionId })),
		onSuccess: ({ sectionId }) => invalidateLogScope(qc, sectionId ?? null),
	});

	return { create, update, remove };
}
