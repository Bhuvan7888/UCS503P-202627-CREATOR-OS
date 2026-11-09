import { z } from 'zod';

// ─── Create / Update ─────────────────────────────────────────

export const CreatePerformanceLogObject = z.object({
  dealId: z.string().optional().nullable(),
  deliverableId: z.string().optional().nullable(),
  platform: z.enum([
    'INSTAGRAM',
    'YOUTUBE',
    'TIKTOK',
    'TWITTER',
    'LINKEDIN',
    'TWITCH',
    'PINTEREST',
    'PODCAST',
  ]),
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
  /** ISO date string for when the content was posted */
  recordedAt: z.string().datetime(),
  contentUrl: z.string().url().optional().or(z.literal('')).nullable(),
  notes: z.string().max(500).optional().nullable(),
  // Core metrics
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative().optional().default(0),
  shares: z.number().int().nonnegative().optional().default(0),
  /** Watch-through percentage (0–100) — applicable to video */
  watchTimePercent: z.number().min(0).max(100).optional().nullable(),
  /** Whether this was a paid/sponsored post */
  isPaid: z.boolean().default(false),
  /** Brand category (only required if isPaid) */
  brandCategory: z.string().max(100).optional().nullable(),
});

export const CreatePerformanceLogSchema = CreatePerformanceLogObject.superRefine((data, ctx) => {
  if (data.isPaid) {
    if (!data.dealId || data.dealId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Deal is required for paid posts',
        path: ['dealId'],
      });
    }
    if (!data.brandCategory || data.brandCategory.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Brand category is required for paid posts',
        path: ['brandCategory'],
      });
    }
  }
});

export type CreatePerformanceLog = z.infer<typeof CreatePerformanceLogSchema>;

export const UpdatePerformanceLogSchema = CreatePerformanceLogObject.partial().omit({
  dealId: true,
});
export type UpdatePerformanceLog = z.infer<typeof UpdatePerformanceLogSchema>;

// ─── Calculated Metrics ───────────────────────────────────────

export const PerformanceMetricsSchema = z.object({
  views: z.number(),
  likes: z.number(),
  comments: z.number(),
  saves: z.number(),
  shares: z.number(),
  watchTimePercent: z.number().nullable(),
  /** (likes + comments + saves + shares) / views * 100 */
  engagementRate: z.number(),
  /** deal.amount / views (only if isPaid) */
  cpv: z.number().nullable(),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// ─── Rolling Average Response ─────────────────────────────────

export const RollingAverageSchema = z.object({
  days: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  avgViews: z.number(),
  avgEngagementRate: z.number(),
  avgCpv: z.number().nullable(),
  totalPosts: z.number().int(),
});

export type RollingAverage = z.infer<typeof RollingAverageSchema>;
