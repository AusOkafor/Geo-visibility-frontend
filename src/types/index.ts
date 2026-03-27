export interface Merchant {
  id: string;
  shop_domain: string;
  brand_name: string;
  category: string;
  plan: 'starter' | 'growth' | 'pro';
  active: boolean;
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
  platform: string;
  position: number;
  frequency: number;
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
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  target_gid: string;
  created_at: string;
}
