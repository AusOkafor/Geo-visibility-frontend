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
  top_queries?: string[];
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
  query_type?: string;
  competitor_count?: number;
  impact?: 'high' | 'medium' | 'low';
  difficulty?: 'low' | 'medium' | 'hard';
}

export interface LiveAnswer {
  query: string;
  answer_text: string;
  platform: string;
  query_type: string;
  scanned_at: string;
}

export interface ReadinessDimension {
  name: string;
  score: number; // 0–10
  label: string; // "Not found" | "Not trusted" etc.
  detail: string;
}

export interface AIReadinessScore {
  overall: number; // 0–100
  dimensions: ReadinessDimension[];
  top_action: string;
}

export interface NextAction {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact_score: number;
}

export interface PipelineStep {
  stage: number;
  name: string;
  done: boolean;
  message: string;
}

export interface VisibilityPipeline {
  steps: PipelineStep[];
  message: string;
  overall_done: boolean;
}

export interface QuickWin {
  id: string;
  title: string;
  copy: string;
  action_url: string;
  tags: string[];
  effort: string;
}

export interface ScanProgress {
  total_queries: number;
  total_mentions: number;
  first_scan_date: string;
  last_scan_date: string;
  delta_mentions: number;
  delta_queries: number;
  first_score: number;
  last_score: number;
  delta_score: number;
}

export interface AuthorityScore {
  // AI-derived signal: % of web-grounded queries where brand was mentioned
  grounded_rate: number;
  grounded_queries: number;
  grounded_hits: number;
  tier: 'none' | 'low' | 'building' | 'established';
  // Merchant-action signal: authority fixes applied (shown separately)
  listings_done: number;
  listings_total: number;
}

export interface Fix {
  id: string;
  fix_type: 'description' | 'faq' | 'schema' | 'listing';
  fix_layer: 'structure' | 'content' | 'authority';
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
