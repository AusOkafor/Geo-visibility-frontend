const API_HOST = import.meta.env.VITE_API_HOST ?? 'https://geo-v-backend.onrender.com';
const ADMIN_BASE = `${API_HOST}/admin`;

export type SpotCheckStatus = 'pending' | 'verified';

export interface SpotCheck {
  id: number;
  citation_record_id: number;
  merchant_id: number;
  query_text: string;
  platform: string;
  ai_response: string;
  manual_brands: string[] | null;
  detected_brands: string[] | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  status: SpotCheckStatus;
  verified_by_type: string;
  verified_by_email: string | null;
  verified_at: string | null;
  created_at: string;
  // Integrity fields — sourced from the originating citation_record.
  response_hash: string;
  model_version: string;
  integrity_valid: boolean;
}

export interface AccuracyMetric {
  date: string;
  platform: string;
  avg_precision: number;
  avg_recall: number;
  avg_f1: number;
  sample_size: number;
}

function getAdminKey(): string {
  return localStorage.getItem('admin_api_key') ?? '';
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminKey()}`,
      ...options?.headers,
    },
  });

  if (res.status === 401 || res.status === 503) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const createSpotCheck = (merchantId: number, citationRecordId: number): Promise<SpotCheck> =>
  adminRequest('/spot-checks', {
    method: 'POST',
    body: JSON.stringify({ merchant_id: merchantId, citation_record_id: citationRecordId }),
  });

export const listSpotChecks = (merchantId: number, limit = 50): Promise<SpotCheck[]> =>
  adminRequest(`/spot-checks?merchant_id=${merchantId}&limit=${limit}`);

export const verifySpotCheck = (
  id: number,
  manualBrands: string[],
  verifiedByEmail: string
): Promise<SpotCheck> =>
  adminRequest(`/spot-checks/${id}/verify`, {
    method: 'PUT',
    body: JSON.stringify({
      manual_brands: manualBrands,
      verified_by_email: verifiedByEmail,
    }),
  });

export const getAccuracyMetrics = (merchantId: number): Promise<AccuracyMetric[]> =>
  adminRequest(`/spot-checks/accuracy?merchant_id=${merchantId}`);
