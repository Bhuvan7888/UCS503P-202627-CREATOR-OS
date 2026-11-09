'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CreatePerformanceLogSchema =
  exports.PerformanceLogSchema =
  exports.PerformanceMetricsSchema =
    void 0;
const zod_1 = require('zod');
exports.PerformanceMetricsSchema = zod_1.z.object({
  views: zod_1.z.number().int().nonnegative().nullable().optional(),
  impressions: zod_1.z.number().int().nonnegative().nullable().optional(),
  reach: zod_1.z.number().int().nonnegative().nullable().optional(),
  likes: zod_1.z.number().int().nonnegative().nullable().optional(),
  comments: zod_1.z.number().int().nonnegative().nullable().optional(),
  shares: zod_1.z.number().int().nonnegative().nullable().optional(),
  saves: zod_1.z.number().int().nonnegative().nullable().optional(),
  clicks: zod_1.z.number().int().nonnegative().nullable().optional(),
  conversions: zod_1.z.number().int().nonnegative().nullable().optional(),
  revenue: zod_1.z.number().nonnegative().nullable().optional(),
  engagementRate: zod_1.z.number().min(0).max(100).nullable().optional(),
  ctr: zod_1.z.number().min(0).max(100).nullable().optional(),
  conversionRate: zod_1.z.number().min(0).max(100).nullable().optional(),
});
exports.PerformanceLogSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  dealId: zod_1.z.string().cuid(),
  deliverableId: zod_1.z.string().cuid().nullable().optional(),
  creatorId: zod_1.z.string().cuid(),
  recordedAt: zod_1.z.coerce.date(),
  metrics: exports.PerformanceMetricsSchema,
  source: zod_1.z.enum(['MANUAL', 'API_SYNC', 'IMPORT']).default('MANUAL'),
  platform: zod_1.z.string().max(100).nullable().optional(),
  contentUrl: zod_1.z.string().url().nullable().optional(),
  notes: zod_1.z.string().max(2000).nullable().optional(),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.CreatePerformanceLogSchema = exports.PerformanceLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
//# sourceMappingURL=performance.schema.js.map
