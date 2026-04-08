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

// ─── Citation Verifier ────────────────────────────────────────────────────────

export interface HallucinationFlag {
  brand: string;
  occurrences: number;
  reason: string;
}

export interface VerificationResult {
  id: number;
  citation_record_id: number;
  merchant_id: number;
  query: string;
  platform: string;
  original_response: string;
  re_query_response: string;
  similarity_score: number;
  response_changed: boolean;
  hallucinations: HallucinationFlag[];
  hallucination_count: number;
  is_authentic: boolean;
}

export interface PlatformResult {
  brands: string[];
  mentioned: boolean;
  response: string;
  error?: string;
}

export interface CrossPlatformResult {
  query: string;
  merchant_id: number;
  consistency_score: number;
  shared_brands: string[];
  platforms: Record<string, PlatformResult>;
}

export interface VerificationRecord {
  id: number;
  citation_record_id: number;
  merchant_id: number;
  verified_at: string;
  original_query: string;
  original_platform: string;
  original_response: string;
  re_query_response: string;
  similarity_score: number | null;
  response_changed: boolean;
  hallucination_flags: HallucinationFlag[];
  hallucination_count: number;
  cross_platform_results: Record<string, PlatformResult>;
  consistency_score: number | null;
  is_authentic: boolean;
  verification_notes: string;
}

export interface StabilityRecord {
  id: number;
  merchant_id: number;
  query_text: string;
  platform: string;
  first_seen_at: string;
  last_checked_at: string;
  check_count: number;
  avg_similarity: number;
  min_similarity: number;
  drift_detected: boolean;
}

export const verifyCitation = (citationId: number, merchantId: number): Promise<VerificationResult> =>
  adminRequest(`/verifier/citations/${citationId}?merchant_id=${merchantId}`, { method: 'POST' });

export const crossPlatform = (query: string, brandName: string, merchantId: number): Promise<CrossPlatformResult> =>
  adminRequest('/verifier/cross-platform', {
    method: 'POST',
    body: JSON.stringify({ query, brand_name: brandName, merchant_id: merchantId }),
  });

export const listVerifications = (merchantId: number, limit = 50): Promise<VerificationRecord[]> =>
  adminRequest(`/verifier/history?merchant_id=${merchantId}&limit=${limit}`);

export const getStability = (merchantId: number, limit = 50): Promise<StabilityRecord[]> =>
  adminRequest(`/verifier/stability?merchant_id=${merchantId}&limit=${limit}`);

// ─── Review Detector ──────────────────────────────────────────────────────────

export interface MerchantReviewStatus {
  merchant_id: number;
  shop_domain: string;
  brand_name: string;
  review_app: string | null;
  avg_rating: number | null;
  total_reviews: number;
  review_schema_injected: boolean;
  reviews_last_scanned_at: string | null;
}

export const listMerchantReviews = (): Promise<MerchantReviewStatus[]> =>
  adminRequest('/reviews');

export const scanMerchantReviews = (merchantId: number): Promise<{ queued: boolean; merchant_id: number }> =>
  adminRequest(`/reviews/scan/${merchantId}`, { method: 'POST' });

export const scanAllReviews = (): Promise<{ queued: number; total: number }> =>
  adminRequest('/reviews/scan-all', { method: 'POST' });

// ─── Onboarding Audit ─────────────────────────────────────────────────────────

export const triggerAudit = (merchantId: number): Promise<{ queued: boolean; merchant_id: number }> =>
  adminRequest(`/audit/${merchantId}`, { method: 'POST' });
