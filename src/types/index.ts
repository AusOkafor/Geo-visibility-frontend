export interface Merchant {
  id: string;
  shop_domain: string;
  brand_name: string;
  category: string;
  plan: 'free' | 'starter' | 'growth' | 'pro';
  active: boolean;
  installed_at: string;
}

export interface VisibilityScore {
  platform: 'chatgpt' | 'perplexity' | 'gemini';
  score: number;
  score_date: string;
  queries_run: number;
  queries_hit: number;
}

export interface DailyScore {
  date: string;
  chatgpt: number;
  perplexity: number;
  gemini: number;
}

export interface Competitor {
  name: string;
  platforms: string[];
  best_position: number;
  platform_positions: Record<string, number>;
  total_frequency: number;
  total_scans: number;
  score: number;
  why_points: string[];
  class?: 'brand' | 'retailer';
  tier?: 1 | 2 | 3;
}

export interface PlatformSource {
  platform: string;
  grounded: boolean; // true = real web search; false = model memory / AI prediction
}

export interface BrandRecognition {
  recognition_rate: number;
  mentioned_queries: number;
  total_queries: number;
  is_recognized: boolean;
  tier: 'not_recognized' | 'weak' | 'recognized';
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface QueryGap {
  query: string;
  platforms: string[];
}

export interface Fix {
  id: string;
  fix_type: 'description' | 'faq' | 'schema' | 'listing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  original: Record<string, unknown>;
  generated: Record<string, unknown>;
  est_impact: number;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'manual' | 'applying';
  target_gid: string;
  created_at: string;
}
