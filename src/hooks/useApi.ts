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

export const useBrandRecognition = () =>
  useQuery({ queryKey: ['brand-recognition'], queryFn: api.getBrandRecognition });

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
  return useMutation({
    mutationFn: api.triggerScan,
    // All data refresh is handled by DashboardHome's polling loop on completion
  });
};

export const useCancelScan = () => {
  return useMutation({ mutationFn: api.cancelScan });
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

export const useLiveAnswers = (limit = 20) =>
  useQuery({ queryKey: ['live-answers', limit], queryFn: () => api.getLiveAnswers(limit) });

export const useAIReadiness = () =>
  useQuery({ queryKey: ['ai-readiness'], queryFn: api.getAIReadiness });

export const useNextActions = () =>
  useQuery({ queryKey: ['next-actions'], queryFn: api.getNextActions });

export const useVisibilityPipeline = () =>
  useQuery({ queryKey: ['visibility-pipeline'], queryFn: api.getVisibilityPipeline });

export const useQuickWins = () =>
  useQuery({ queryKey: ['quick-wins'], queryFn: api.getQuickWins });

export const useScanProgress = () =>
  useQuery({ queryKey: ['scan-progress'], queryFn: api.getScanProgress });

export const useSchemaStatus = () =>
  useQuery({ queryKey: ['schema-status'], queryFn: api.getSchemaStatus });

export const useAuthorityScore = () =>
  useQuery({ queryKey: ['authority-score'], queryFn: api.getAuthorityScore });

export const useSocialLinks = () =>
  useQuery({ queryKey: ['social-links'], queryFn: api.getSocialLinks });

export const useUpdateSocialLinks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateSocialLinks,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-links'] });
    },
  });
};

export const useMerchantFAQs = () =>
  useQuery({ queryKey: ['merchant-faqs'], queryFn: api.getMerchantFAQs });

export const useUpdateMerchantFAQs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateMerchantFAQs,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant-faqs'] });
    },
  });
};

export const useFAQSuggestions = () =>
  useMutation({ mutationFn: api.getFAQSuggestions });

export const useAuditProgress = () =>
  useQuery({ queryKey: ['audit-progress'], queryFn: api.getAuditProgress });

export const useAuditProducts = () =>
  useQuery({ queryKey: ['audit-products'], queryFn: api.getAuditProducts });

export const useAuditCollections = () =>
  useQuery({ queryKey: ['audit-collections'], queryFn: api.getAuditCollections });

export const useAuditPages = () =>
  useQuery({ queryKey: ['audit-pages'], queryFn: api.getAuditPages });

export const useRefreshAudit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.refreshAudit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-progress'] });
      qc.invalidateQueries({ queryKey: ['audit-products'] });
      qc.invalidateQueries({ queryKey: ['audit-collections'] });
      qc.invalidateQueries({ queryKey: ['audit-pages'] });
    },
  });
};

export const useMerchantCenterStatus = () =>
  useQuery({ queryKey: ['merchant-center-status'], queryFn: api.getMerchantCenterStatus });

export const useExternalMentions = (limit = 50) =>
  useQuery({ queryKey: ['external-mentions', limit], queryFn: () => api.getExternalMentions(limit) });

export const useExternalMentionStats = () =>
  useQuery({ queryKey: ['external-mention-stats'], queryFn: api.getExternalMentionStats });

export const useCreateExternalMention = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createExternalMention,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-mentions'] });
      qc.invalidateQueries({ queryKey: ['external-mention-stats'] });
    },
  });
};
