export interface PerformanceMetrics {
  views?: number | null;
  impressions?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  revenue?: number | null;
  engagementRate?: number | null;
  ctr?: number | null;
  conversionRate?: number | null;
}

export interface PerformanceLog {
  id: string;
  dealId: string;
  deliverableId?: string | null;
  creatorId: string;
  recordedAt: Date;
  metrics: PerformanceMetrics;
  source: 'MANUAL' | 'API_SYNC' | 'IMPORT';
  platform?: string | null;
  contentUrl?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
