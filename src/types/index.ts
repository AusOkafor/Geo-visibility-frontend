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
  total_frequency: number;
  total_scans: number;
  score: number;
  why_points: string[];
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
