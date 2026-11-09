import { z } from 'zod';

export const PerformanceMetricsSchema = z.object({
  views: z.number().int().nonnegative().nullable().optional(),
  impressions: z.number().int().nonnegative().nullable().optional(),
  reach: z.number().int().nonnegative().nullable().optional(),
  likes: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
  shares: z.number().int().nonnegative().nullable().optional(),
  saves: z.number().int().nonnegative().nullable().optional(),
  clicks: z.number().int().nonnegative().nullable().optional(),
  conversions: z.number().int().nonnegative().nullable().optional(),
  revenue: z.number().nonnegative().nullable().optional(),
  engagementRate: z.number().min(0).max(100).nullable().optional(),
  ctr: z.number().min(0).max(100).nullable().optional(),
  conversionRate: z.number().min(0).max(100).nullable().optional(),
});

export const PerformanceLogSchema = z.object({
  id: z.string().cuid(),
  dealId: z.string().cuid(),
  deliverableId: z.string().cuid().nullable().optional(),
  creatorId: z.string().cuid(),
  recordedAt: z.coerce.date(),
  metrics: PerformanceMetricsSchema,
  source: z.enum(['MANUAL', 'API_SYNC', 'IMPORT']).default('MANUAL'),
  platform: z.string().max(100).nullable().optional(),
  contentUrl: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreatePerformanceLogSchema = PerformanceLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
