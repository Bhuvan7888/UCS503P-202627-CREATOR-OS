import { z } from 'zod';

export const BriefParsedDeliverableSchema = z.object({
  type: z.string(),
  quantity: z.number().int().positive().default(1),
  platform: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const BriefParsedDeadlineSchema = z.object({
  event: z.string(),
  date: z.string(), // ISO date string or formatted date
});

export const BriefFtcFlagSchema = z.object({
  rule: z.string(),
  warning: z.string(),
});

export const BriefParsedDataSchema = z.object({
  deliverables: z.array(BriefParsedDeliverableSchema).default([]),
  deadlines: z.array(BriefParsedDeadlineSchema).default([]),
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
  ftcFlags: z.array(BriefFtcFlagSchema).default([]),
});

export const BriefSchema = z.object({
  id: z.string().cuid(),
  dealId: z.string().cuid(),
  fileUrl: z.string().url().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  parsedData: BriefParsedDataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type BriefParsedDataInput = z.infer<typeof BriefParsedDataSchema>;
