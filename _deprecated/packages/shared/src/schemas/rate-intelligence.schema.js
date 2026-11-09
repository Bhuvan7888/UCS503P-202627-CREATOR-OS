'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.RateIntelligenceResponseSchema =
  exports.RateIntelligenceResultSchema =
  exports.RateIntelligenceInputSchema =
  exports.UsageRightEnum =
  exports.DealTypeEnum =
  exports.BrandTierEnum =
    void 0;
const zod_1 = require('zod');
exports.BrandTierEnum = zod_1.z.enum(['NANO', 'MICRO', 'MID', 'MACRO', 'MEGA', 'ENTERPRISE']);
exports.DealTypeEnum = zod_1.z.enum([
  'SPONSORED_POST',
  'UGC',
  'AMBASSADOR',
  'AFFILIATE',
  'PRODUCT_GIFTING',
  'EVENT',
]);
exports.UsageRightEnum = zod_1.z.enum([
  'ORGANIC_ONLY',
  'PAID_ADS',
  'WHITELISTING',
  'EXCLUSIVITY',
  'IN_PERPETUITY',
  'GEO_RESTRICTED',
  'REPURPOSE_ALLOWED',
]);
exports.RateIntelligenceInputSchema = zod_1.z.object({
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
  usageRights: zod_1.z.array(exports.UsageRightEnum).min(1, 'Select at least one usage right'),
  exclusivityDays: zod_1.z.number().int().min(0).max(730),
  isRush: zod_1.z.boolean().default(false),
  revisionRounds: zod_1.z.number().int().min(0).max(10).default(2),
  brandTier: exports.BrandTierEnum,
  dealType: exports.DealTypeEnum,
  brandCategory: zod_1.z.string().min(1).max(100),
});
exports.RateIntelligenceResultSchema = zod_1.z.object({
  recommendedMin: zod_1.z.number().positive(),
  recommendedMax: zod_1.z.number().positive(),
  rationale: zod_1.z.string().min(10).max(500),
  peerComparison: zod_1.z.object({
    label: zod_1.z.string(),
    percentile: zod_1.z.number().min(0).max(100),
    insight: zod_1.z.string().max(200),
  }),
  brandComparison: zod_1.z.object({
    label: zod_1.z.string(),
    averageRate: zod_1.z.number().nonnegative(),
    insight: zod_1.z.string().max(200),
  }),
  counterofferEmail: zod_1.z.string().min(50).max(2000),
  negotiationPoints: zod_1.z.array(zod_1.z.string().max(200)).min(3).max(5),
});
exports.RateIntelligenceResponseSchema = zod_1.z.object({
  requestId: zod_1.z.string(),
  input: exports.RateIntelligenceInputSchema,
  result: exports.RateIntelligenceResultSchema,
  currency: zod_1.z.string().length(3),
  createdAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=rate-intelligence.schema.js.map
