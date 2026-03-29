import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';

export const useMerchant = () =>
  useQuery({ queryKey: ['merchant'], queryFn: api.getMerchant });

export const useVisibilityScores = (days: number) =>
  useQuery({
    queryKey: ['visibility-scores', days],
    queryFn: () => api.getVisibilityScores(days),
  });

export const useDailyScores = (days: number) =>
  useQuery({
    queryKey: ['daily-scores', days],
    queryFn: () => api.getDailyScores(days),
  });

export const useCompetitors = () =>
  useQuery({ queryKey: ['competitors'], queryFn: api.getCompetitors });

export const usePlatformSources = () =>
  useQuery({ queryKey: ['platform-sources'], queryFn: api.getPlatformSources });

export const useQueryGaps = () =>
  useQuery({ queryKey: ['query-gaps'], queryFn: api.getQueryGaps });

export const useFixes = (status?: string) =>
  useQuery({
    queryKey: ['fixes', status],
    queryFn: () => api.getFixes(status),
  });

export const useFix = (id: string) =>
  useQuery({
    queryKey: ['fix', id],
    queryFn: () => api.getFix(id),
    enabled: !!id,
  });

export const useApproveFix = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.approveFix,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixes'] });
      qc.invalidateQueries({ queryKey: ['fix'] });
    },
  });
};

export const useRejectFix = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.rejectFix,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixes'] });
      qc.invalidateQueries({ queryKey: ['fix'] });
    },
  });
};

export const useTriggerScan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.triggerScan,
    onSuccess: () => {
      // Refetch visibility + competitors after a short delay so results appear
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['visibility-scores'] });
        qc.invalidateQueries({ queryKey: ['daily-scores'] });
        qc.invalidateQueries({ queryKey: ['competitors'] });
      }, 8000);
    },
  });
};

export const useUpdateMerchant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateMerchant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant'] });
    },
  });
};
