import { z } from 'zod';

export const DealStatusSchema = z.enum([
  'DRAFT',
  'NEGOTIATING',
  'PENDING_CONTRACT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
]);

export const DeliverableTypeSchema = z.enum([
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

export const DeliverableStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REVISION_REQUESTED',
]);

export const DeliverableSchema = z.object({
  id: z.string().cuid(),
  dealId: z.string().cuid(),
  type: DeliverableTypeSchema,
  status: DeliverableStatusSchema.default('PENDING'),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.coerce.date(),
  submittedAt: z.coerce.date().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  platform: z.string().max(100).nullable().optional(),
  contentUrl: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const DealStageSchema = z.enum([
  'NEW_INQUIRY',
  'QUALIFIED',
  'PITCH_SENT',
  'NEGOTIATING',
  'CONTRACT_SENT',
  'ACTIVE',
  'COMPLETED',
  'LOST',
]);
export type DealStage = z.infer<typeof DealStageSchema>;

export const DealSchema = z.object({
  id: z.string().cuid(),
  creatorId: z.string().cuid(),
  brandName: z.string().min(1).max(255),
  brandEmail: z.string().email().nullable().optional(),
  brandWebsite: z.string().url().nullable().optional(),
  brandInstagram: z.string().max(255).nullable().optional(),
  dealSource: z.string().max(255).nullable().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  status: DealStatusSchema.default('DRAFT'),
  stage: DealStageSchema.default('NEW_INQUIRY'),
  quotedAmount: z.number().positive().nullable().optional(),
  offeredAmount: z.number().positive().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  deadline: z.coerce.date().nullable().optional(),
  followUpReminder: z.coerce.date().nullable().optional(),
  exclusivityDays: z.number().int().positive().nullable().optional(),
  exclusivityNotes: z.string().max(2000).nullable().optional(),
  usageRights: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string()).default([]),
  isUnlinked: z.boolean().default(false),
  deliverables: z.array(DeliverableSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateDealSchema = DealSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deliverables: true,
}).extend({
  deliverables: z
    .array(DeliverableSchema.omit({ id: true, dealId: true, createdAt: true, updatedAt: true }))
    .default([]),
});

export const UpdateDealSchema = CreateDealSchema.partial();
