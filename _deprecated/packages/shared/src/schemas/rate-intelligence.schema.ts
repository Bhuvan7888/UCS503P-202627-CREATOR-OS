import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────

export const BrandTierEnum = z.enum(['NANO', 'MICRO', 'MID', 'MACRO', 'MEGA', 'ENTERPRISE']);
export type BrandTier = z.infer<typeof BrandTierEnum>;

export const DealTypeEnum = z.enum([
  'SPONSORED_POST',
  'UGC',
  'AMBASSADOR',
  'AFFILIATE',
  'PRODUCT_GIFTING',
  'EVENT',
]);
export type DealType = z.infer<typeof DealTypeEnum>;

export const UsageRightEnum = z.enum([
  'ORGANIC_ONLY',
  'PAID_ADS',
  'WHITELISTING',
  'EXCLUSIVITY',
  'IN_PERPETUITY',
  'GEO_RESTRICTED',
  'REPURPOSE_ALLOWED',
]);
export type UsageRight = z.infer<typeof UsageRightEnum>;

// ─── Input Schema ─────────────────────────────────────────────

export const RateIntelligenceInputSchema = z.object({
  /** Content format being priced */
  contentFormat: z.enum([
    'SHORT_FORM_VIDEO',
    'LONG_FORM_VIDEO',
    'STATIC_IMAGE',
    'CAROUSEL',
    'STORIES',
    'LIVE_STREAM',
    'PODCAST',
    'BLOG_ARTICLE',
    'NEWSLETTER',
    'UGC_RAW_FOOTAGE',
  ]),
  /** Usage rights requested by brand (multi-select) */
  usageRights: z.array(UsageRightEnum).min(1, 'Select at least one usage right'),
  /** Exclusivity window in days (0 = none) */
  exclusivityDays: z.number().int().min(0).max(730),
  /** Rush delivery (< 72h turnaround) */
  isRush: z.boolean().default(false),
  /** Number of revision rounds included */
  revisionRounds: z.number().int().min(0).max(10).default(2),
  /** Estimated brand audience size / tier */
  brandTier: BrandTierEnum,
  /** Type of deal */
  dealType: DealTypeEnum,
  /** Brand's primary category */
  brandCategory: z.string().min(1).max(100),
  /** Creator's followers count */
  followers: z.number().int().min(0),
  /** Monthly dashboard details */
  dashboardDetails: z.string().optional(),
});

export type RateIntelligenceInput = z.infer<typeof RateIntelligenceInputSchema>;

// ─── Result Schema (Gemini output validated with this) ────────

export const RateIntelligenceResultSchema = z.object({
  /** Minimum recommended quote in creator's currency */
  recommendedMin: z.number().positive(),
  /** Maximum recommended quote in creator's currency */
  recommendedMax: z.number().positive(),
  /** 2-3 sentence rationale */
  rationale: z.string().min(10).max(500),
  /** Peer creator comparison */
  peerComparison: z.object({
    label: z.string(),
    percentile: z.number().min(0).max(100),
    insight: z.string().max(200),
  }),
  /** Brand-specific comparison */
  brandComparison: z.object({
    label: z.string(),
    averageRate: z.number().nonnegative(),
    insight: z.string().max(200),
  }),
  /** Counteroffer email copy (max 250 words) */
  counterofferEmail: z.string().min(50).max(2000),
  /** 3-5 negotiation talking points */
  negotiationPoints: z.array(z.string().max(200)).min(3).max(5),
  /** Analysis of the brand itself */
  brandAnalysis: z.string().min(10).max(2000),
  /** Cited comparables that influenced the recommendation */
  citedComparables: z.array(z.string()).max(3).optional().default([]),
  /** Confidence in brand research */
  brandResearchConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM'),
});

export type RateIntelligenceResult = z.infer<typeof RateIntelligenceResultSchema>;

export const RateIntelligenceResponseSchema = z.object({
  requestId: z.string(),
  input: RateIntelligenceInputSchema,
  result: RateIntelligenceResultSchema,
  currency: z.string().length(3),
  createdAt: z.string().datetime(),
});

export type RateIntelligenceResponse = z.infer<typeof RateIntelligenceResponseSchema>;
