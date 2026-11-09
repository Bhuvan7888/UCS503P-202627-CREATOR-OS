'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.RollingAverageSchema =
  exports.PerformanceMetricsSchema =
  exports.UpdatePerformanceLogSchema =
  exports.CreatePerformanceLogSchema =
  exports.CreatePerformanceLogObject =
    void 0;
const zod_1 = require('zod');
exports.CreatePerformanceLogObject = zod_1.z.object({
  dealId: zod_1.z.string().optional().nullable(),
  deliverableId: zod_1.z.string().optional().nullable(),
  platform: zod_1.z.enum([
    'INSTAGRAM',
    'YOUTUBE',
    'TIKTOK',
    'TWITTER',
    'LINKEDIN',
    'TWITCH',
    'PINTEREST',
    'PODCAST',
  ]),
  contentFormat: zod_1.z.enum([
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
  recordedAt: zod_1.z.string().datetime(),
  contentUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')).nullable(),
  notes: zod_1.z.string().max(500).optional().nullable(),
  views: zod_1.z.number().int().nonnegative(),
  likes: zod_1.z.number().int().nonnegative(),
  comments: zod_1.z.number().int().nonnegative(),
  saves: zod_1.z.number().int().nonnegative().optional().default(0),
  shares: zod_1.z.number().int().nonnegative().optional().default(0),
  watchTimePercent: zod_1.z.number().min(0).max(100).optional().nullable(),
  isPaid: zod_1.z.boolean().default(false),
  brandCategory: zod_1.z.string().max(100).optional().nullable(),
});
exports.CreatePerformanceLogSchema = exports.CreatePerformanceLogObject.superRefine((data, ctx) => {
  if (data.isPaid) {
    if (!data.dealId || data.dealId.trim() === '') {
      ctx.addIssue({
        code: zod_1.z.ZodIssueCode.custom,
        message: 'Deal is required for paid posts',
        path: ['dealId'],
      });
    }
    if (!data.brandCategory || data.brandCategory.trim() === '') {
      ctx.addIssue({
        code: zod_1.z.ZodIssueCode.custom,
        message: 'Brand category is required for paid posts',
        path: ['brandCategory'],
      });
    }
  }
});
exports.UpdatePerformanceLogSchema = exports.CreatePerformanceLogObject.partial().omit({
  dealId: true,
});
exports.PerformanceMetricsSchema = zod_1.z.object({
  views: zod_1.z.number(),
  likes: zod_1.z.number(),
  comments: zod_1.z.number(),
  saves: zod_1.z.number(),
  shares: zod_1.z.number(),
  watchTimePercent: zod_1.z.number().nullable(),
  engagementRate: zod_1.z.number(),
  cpv: zod_1.z.number().nullable(),
});
exports.RollingAverageSchema = zod_1.z.object({
  days: zod_1.z.union([zod_1.z.literal(30), zod_1.z.literal(60), zod_1.z.literal(90)]),
  avgViews: zod_1.z.number(),
  avgEngagementRate: zod_1.z.number(),
  avgCpv: zod_1.z.number().nullable(),
  totalPosts: zod_1.z.number().int(),
});
//# sourceMappingURL=performance-log.schema.js.map
