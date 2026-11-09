import { z } from 'zod';

export const ContractStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'PENDING_SIGNATURE',
  'SIGNED',
  'EXPIRED',
  'TERMINATED',
]);

export const CreatorContractReadStatusSchema = z.enum([
  'UNREAD',
  'READ',
  'ONGOING',
  'COMPLETED',
]);

export const RiskSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ContractRiskFlagSchema = z.object({
  id: z.string().cuid(),
  contractId: z.string().cuid(),
  clause: z.string().min(1).max(500),
  clauseText: z.string().max(5000).nullable().optional(),
  severity: RiskSeveritySchema,
  description: z.string().min(1).max(2000),
  recommendation: z.string().max(2000).nullable().optional(),
  scenario: z.string().max(2000).nullable().optional(),
  suggestedClause: z.string().max(5000).nullable().optional(),
  pageNumber: z.number().int().positive().nullable().optional(),
  isAcknowledged: z.boolean().default(false),
  acknowledgedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const ContractSchema = z.object({
  id: z.string().cuid(),
  dealId: z.string().cuid(),
  creatorId: z.string().cuid(),
  title: z.string().min(1).max(500),
  fileUrl: z.string().url().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  status: ContractStatusSchema.default('DRAFT'),
  signedAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  parties: z.array(z.string()).default([]),
  jurisdiction: z.string().max(255).nullable().optional(),
  governingLaw: z.string().max(255).nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  overallRiskScore: z.number().min(0).max(100).nullable().optional(),
  creatorReadStatus: CreatorContractReadStatusSchema.default('UNREAD'),
  riskFlags: z.array(ContractRiskFlagSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UpdateContractSchema = ContractSchema.omit({
  id: true,
  dealId: true,
  creatorId: true,
  createdAt: true,
  updatedAt: true,
  riskFlags: true,
}).partial();

// Form schema for programmatically generating a DOCX contract
export const CreateContractGenerationSchema = z.object({
  brandName: z.string().min(1),
  creatorName: z.string().min(1),
  dealId: z.string().cuid().optional(),
  contractType: z
    .enum(['SPONSORED_POST', 'UGC', 'AMBASSADOR', 'AFFILIATE', 'OTHER'])
    .default('SPONSORED_POST'),
  exclusivityDays: z.number().int().min(0).default(0),
  exclusivityScope: z.string().max(1000).optional(),
  usageRightsScope: z.string().max(1000).default('Organic only'),
  killFeePercent: z.number().min(0).max(100).default(50),
  revisionLimit: z.number().int().min(0).default(2),
  latePaymentPenaltyPercent: z.number().min(0).max(100).default(5),
  latePaymentPenaltyToggle: z.boolean().default(true),
  includeFtcDisclosure: z.boolean().default(true),
  governingLaw: z.string().max(255).default('California'),
});

// AI analysis output schema for validation
export const ContractAnalysisResultSchema = z.object({
  overallRiskScore: z.number().min(0).max(100),
  summary: z.string(),
  parties: z.array(z.string()).default([]),
  jurisdiction: z.string().nullable().optional(),
  governingLaw: z.string().nullable().optional(),
  riskFlags: z
    .array(
      z.object({
        clause: z.string(),
        clauseText: z.string().nullable().optional(),
        severity: RiskSeveritySchema,
        description: z.string(),
        recommendation: z.string().nullable().optional(),
        scenario: z.string().nullable().optional(),
        suggestedClause: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export type CreateContractGenerationInput = z.infer<typeof CreateContractGenerationSchema>;
export type ContractAnalysisResult = z.infer<typeof ContractAnalysisResultSchema>;
