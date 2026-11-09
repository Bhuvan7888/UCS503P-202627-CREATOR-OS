'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UpdateDealSchema =
  exports.CreateDealSchema =
  exports.DealSchema =
  exports.DealStageSchema =
  exports.DeliverableSchema =
  exports.DeliverableStatusSchema =
  exports.DeliverableTypeSchema =
  exports.DealStatusSchema =
    void 0;
const zod_1 = require('zod');
exports.DealStatusSchema = zod_1.z.enum([
  'DRAFT',
  'NEGOTIATING',
  'PENDING_CONTRACT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
]);
exports.DeliverableTypeSchema = zod_1.z.enum([
  'INSTAGRAM_POST',
  'INSTAGRAM_REEL',
  'INSTAGRAM_STORY',
  'YOUTUBE_VIDEO',
  'YOUTUBE_SHORT',
  'TIKTOK_VIDEO',
  'TWITTER_POST',
  'LINKEDIN_POST',
  'BLOG_POST',
  'PODCAST_MENTION',
  'LIVE_STREAM',
  'NEWSLETTER',
  'UGC_CONTENT',
  'OTHER',
]);
exports.DeliverableStatusSchema = zod_1.z.enum([
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REVISION_REQUESTED',
]);
exports.DeliverableSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  dealId: zod_1.z.string().cuid(),
  type: exports.DeliverableTypeSchema,
  status: exports.DeliverableStatusSchema.default('PENDING'),
  description: zod_1.z.string().max(2000).nullable().optional(),
  dueDate: zod_1.z.coerce.date(),
  submittedAt: zod_1.z.coerce.date().nullable().optional(),
  approvedAt: zod_1.z.coerce.date().nullable().optional(),
  platform: zod_1.z.string().max(100).nullable().optional(),
  contentUrl: zod_1.z.string().url().nullable().optional(),
  notes: zod_1.z.string().max(2000).nullable().optional(),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.DealStageSchema = zod_1.z.enum([
  'NEW_INQUIRY',
  'QUALIFIED',
  'PITCH_SENT',
  'NEGOTIATING',
  'CONTRACT_SENT',
  'ACTIVE',
  'COMPLETED',
  'LOST',
]);
exports.DealSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  creatorId: zod_1.z.string().cuid(),
  brandName: zod_1.z.string().min(1).max(255),
  brandEmail: zod_1.z.string().email().nullable().optional(),
  brandWebsite: zod_1.z.string().url().nullable().optional(),
  brandInstagram: zod_1.z.string().max(255).nullable().optional(),
  dealSource: zod_1.z.string().max(255).nullable().optional(),
  title: zod_1.z.string().min(1).max(500),
  description: zod_1.z.string().max(5000).nullable().optional(),
  amount: zod_1.z.number().positive(),
  currency: zod_1.z.string().length(3).default('USD'),
  status: exports.DealStatusSchema.default('DRAFT'),
  stage: exports.DealStageSchema.default('NEW_INQUIRY'),
  quotedAmount: zod_1.z.number().positive().nullable().optional(),
  offeredAmount: zod_1.z.number().positive().nullable().optional(),
  startDate: zod_1.z.coerce.date().nullable().optional(),
  endDate: zod_1.z.coerce.date().nullable().optional(),
  deadline: zod_1.z.coerce.date().nullable().optional(),
  followUpReminder: zod_1.z.coerce.date().nullable().optional(),
  exclusivityDays: zod_1.z.number().int().positive().nullable().optional(),
  exclusivityNotes: zod_1.z.string().max(2000).nullable().optional(),
  usageRights: zod_1.z.string().max(2000).nullable().optional(),
  notes: zod_1.z.string().max(5000).nullable().optional(),
  tags: zod_1.z.array(zod_1.z.string()).default([]),
  deliverables: zod_1.z.array(exports.DeliverableSchema).default([]),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.CreateDealSchema = exports.DealSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deliverables: true,
}).extend({
  deliverables: zod_1.z
    .array(
      exports.DeliverableSchema.omit({ id: true, dealId: true, createdAt: true, updatedAt: true }),
    )
    .default([]),
});
exports.UpdateDealSchema = exports.CreateDealSchema.partial();
//# sourceMappingURL=deal.schema.js.map
