import type { Merchant, VisibilityScore, DailyScore, Competitor, Fix, PlatformSource, QueryGap } from '../types';

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
    window.location.href = '/';
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

export const getFixes = (status?: string): Promise<Fix[]> =>
  request(`/fixes${status ? `?status=${status}` : ''}`);

export const getFix = (id: string): Promise<Fix> => request(`/fixes/${id}`);

export const approveFix = (id: string): Promise<Fix> =>
  request(`/fixes/${id}/approve`, { method: 'POST' });

export const rejectFix = (id: string): Promise<Fix> =>
  request(`/fixes/${id}/reject`, { method: 'POST' });

export const updateMerchant = (data: { brand_name: string; category: string }): Promise<{ status: string }> =>
  request('/merchant', { method: 'PATCH', body: JSON.stringify(data) });

export const triggerScan = (): Promise<{ status: string }> =>
  request('/scans', { method: 'POST' });

export const getScanStatus = (): Promise<{ state: string; attempted_at?: string }> =>
  request('/scans/status');
