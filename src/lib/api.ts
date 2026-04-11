import type { Merchant, VisibilityScore, DailyScore, Competitor, Fix, PlatformSource, QueryGap, BrandRecognition, LiveAnswer, AIReadinessScore, NextAction, VisibilityPipeline, QuickWin, ScanProgress, AuthorityScore, AuditProgress, ProductAudit, CollectionAudit, PageAudit, SchemaValidationResult, ExternalMention, ExternalMentionStats, MerchantCenterStatus } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://geo-v-backend.onrender.com/api/v1';
const API_HOST = import.meta.env.VITE_API_HOST ?? 'https://geo-v-backend.onrender.com';

export function getOAuthURL(shop: string): string {
  return `${API_HOST}/oauth/begin?shop=${encodeURIComponent(shop)}`;
}

function getToken(): string {
  return localStorage.getItem('geo_session_token') ?? '';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('geo_session_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const getMerchant = (): Promise<Merchant> => request('/merchant');

export const getVisibilityScores = (days: number): Promise<VisibilityScore[]> =>
  request(`/visibility/scores?days=${days}`);

export const getDailyScores = (days: number): Promise<DailyScore[]> =>
  request(`/visibility/daily?days=${days}`);

export const getCompetitors = (): Promise<Competitor[]> => request('/competitors');

export const getPlatformSources = (): Promise<PlatformSource[]> =>
  request('/visibility/sources');

export const getQueryGaps = (): Promise<QueryGap[]> =>
  request('/visibility/gaps');

export const getBrandRecognition = (): Promise<BrandRecognition> =>
  request('/visibility/recognition');

export const getFixes = (status?: string): Promise<Fix[]> =>
  request(`/fixes${status ? `?status=${status}` : ''}`);

export const getFix = (id: string): Promise<Fix> => request(`/fixes/${id}`);

export const approveFix = (id: string): Promise<Fix> =>
  request(`/fixes/${id}/approve`, { method: 'POST' });

export const rejectFix = (id: string): Promise<Fix> =>
  request(`/fixes/${id}/reject`, { method: 'POST' });

export const updateMerchant = (data: { brand_name: string; category: string; price_positioning?: string; unique_selling_point?: string }): Promise<{ status: string }> =>
  request('/merchant', { method: 'PATCH', body: JSON.stringify(data) });

export const triggerScan = (): Promise<{ status: string }> =>
  request('/scans', { method: 'POST' });

export const cancelScan = (): Promise<{ status: string }> =>
  request('/scans', { method: 'DELETE' });

export const getScanStatus = (): Promise<{ state: string; attempted_at?: string }> =>
  request('/scans/status');

export const getLiveAnswers = (limit = 20): Promise<LiveAnswer[]> =>
  request(`/visibility/answers?limit=${limit}`);

export const getAIReadiness = (): Promise<AIReadinessScore> =>
  request('/visibility/readiness');

export const getNextActions = (): Promise<NextAction[]> =>
  request('/visibility/actions');

export const getVisibilityPipeline = (): Promise<VisibilityPipeline> =>
  request('/visibility/pipeline');

export const getQuickWins = (): Promise<QuickWin[]> =>
  request('/visibility/quickwins');

export const getScanProgress = (): Promise<ScanProgress> =>
  request('/visibility/progress');

export const getSchemaStatus = (): Promise<{ active: boolean; value: string | null; validation?: SchemaValidationResult }> =>
  request('/schema/status');

export const getAuthorityScore = (): Promise<AuthorityScore> =>
  request('/authority/score');

export const getSocialLinks = (): Promise<{ social_links: string[] }> =>
  request('/merchant/social');

export const updateSocialLinks = (links: string[]): Promise<{ status: string }> =>
  request('/merchant/social', { method: 'PATCH', body: JSON.stringify({ social_links: links }) });

export type MerchantFAQ = { id?: number; question: string; answer: string };

export const getMerchantFAQs = (): Promise<MerchantFAQ[]> =>
  request('/merchant/faqs');

export const updateMerchantFAQs = (faqs: MerchantFAQ[]): Promise<MerchantFAQ[]> =>
  request('/merchant/faqs', { method: 'PUT', body: JSON.stringify(faqs) });

export const getFAQSuggestions = (): Promise<MerchantFAQ[]> =>
  request('/merchant/faqs/suggestions');

export const deleteAllMerchantData = (): Promise<{ status: string }> =>
  request('/merchant/data', { method: 'DELETE' });

export const getAuditProgress = (): Promise<AuditProgress> =>
  request('/audit/progress');

export const getAuditProducts = (): Promise<ProductAudit[]> =>
  request('/audit/products');

export const getAuditCollections = (): Promise<CollectionAudit[]> =>
  request('/audit/collections');

export const getAuditPages = (): Promise<PageAudit[]> =>
  request('/audit/pages');

export const refreshAudit = (): Promise<{ status: string }> =>
  request('/audit/refresh', { method: 'POST' });

export const getExternalMentions = (limit = 50): Promise<ExternalMention[]> =>
  request(`/external-mentions?limit=${limit}`);

export const getExternalMentionStats = (): Promise<ExternalMentionStats> =>
  request('/external-mentions/stats');

export const getMerchantCenterStatus = (): Promise<MerchantCenterStatus> =>
  request('/merchant-center/status');

export const createExternalMention = (body: {
  url: string;
  source_name: string;
  source_type: string;
  source_domain?: string;
  anchor_text?: string;
  context_snippet?: string;
}): Promise<ExternalMention> =>
  request('/external-mentions', { method: 'POST', body: JSON.stringify(body) });
