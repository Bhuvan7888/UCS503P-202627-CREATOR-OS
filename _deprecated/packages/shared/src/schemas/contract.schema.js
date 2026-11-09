'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ContractAnalysisResultSchema =
  exports.CreateContractGenerationSchema =
  exports.UpdateContractSchema =
  exports.ContractSchema =
  exports.ContractRiskFlagSchema =
  exports.RiskSeveritySchema =
  exports.ContractStatusSchema =
    void 0;
const zod_1 = require('zod');
exports.ContractStatusSchema = zod_1.z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'PENDING_SIGNATURE',
  'SIGNED',
  'EXPIRED',
  'TERMINATED',
]);
exports.RiskSeveritySchema = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
exports.ContractRiskFlagSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  contractId: zod_1.z.string().cuid(),
  clause: zod_1.z.string().min(1).max(500),
  clauseText: zod_1.z.string().max(5000).nullable().optional(),
  severity: exports.RiskSeveritySchema,
  description: zod_1.z.string().min(1).max(2000),
  recommendation: zod_1.z.string().max(2000).nullable().optional(),
  scenario: zod_1.z.string().max(2000).nullable().optional(),
  suggestedClause: zod_1.z.string().max(5000).nullable().optional(),
  pageNumber: zod_1.z.number().int().positive().nullable().optional(),
  isAcknowledged: zod_1.z.boolean().default(false),
  acknowledgedAt: zod_1.z.coerce.date().nullable().optional(),
  createdAt: zod_1.z.coerce.date(),
});
exports.ContractSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  dealId: zod_1.z.string().cuid(),
  creatorId: zod_1.z.string().cuid(),
  title: zod_1.z.string().min(1).max(500),
  fileUrl: zod_1.z.string().url().nullable().optional(),
  fileKey: zod_1.z.string().nullable().optional(),
  status: exports.ContractStatusSchema.default('DRAFT'),
  signedAt: zod_1.z.coerce.date().nullable().optional(),
  expiresAt: zod_1.z.coerce.date().nullable().optional(),
  parties: zod_1.z.array(zod_1.z.string()).default([]),
  jurisdiction: zod_1.z.string().max(255).nullable().optional(),
  governingLaw: zod_1.z.string().max(255).nullable().optional(),
  aiSummary: zod_1.z.string().nullable().optional(),
  overallRiskScore: zod_1.z.number().min(0).max(100).nullable().optional(),
  riskFlags: zod_1.z.array(exports.ContractRiskFlagSchema).default([]),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.UpdateContractSchema = exports.ContractSchema.omit({
  id: true,
  dealId: true,
  creatorId: true,
  createdAt: true,
  updatedAt: true,
  riskFlags: true,
}).partial();
exports.CreateContractGenerationSchema = zod_1.z.object({
  brandName: zod_1.z.string().min(1),
  creatorName: zod_1.z.string().min(1),
  dealId: zod_1.z.string().cuid().optional(),
  contractType: zod_1.z
    .enum(['SPONSORED_POST', 'UGC', 'AMBASSADOR', 'AFFILIATE', 'OTHER'])
    .default('SPONSORED_POST'),
  exclusivityDays: zod_1.z.number().int().min(0).default(0),
  exclusivityScope: zod_1.z.string().max(1000).optional(),
  usageRightsScope: zod_1.z.string().max(1000).default('Organic only'),
  killFeePercent: zod_1.z.number().min(0).max(100).default(50),
  revisionLimit: zod_1.z.number().int().min(0).default(2),
  latePaymentPenaltyPercent: zod_1.z.number().min(0).max(100).default(5),
  latePaymentPenaltyToggle: zod_1.z.boolean().default(true),
  includeFtcDisclosure: zod_1.z.boolean().default(true),
  governingLaw: zod_1.z.string().max(255).default('California'),
});
exports.ContractAnalysisResultSchema = zod_1.z.object({
  overallRiskScore: zod_1.z.number().min(0).max(100),
  summary: zod_1.z.string(),
  parties: zod_1.z.array(zod_1.z.string()).default([]),
  jurisdiction: zod_1.z.string().nullable().optional(),
  governingLaw: zod_1.z.string().nullable().optional(),
  riskFlags: zod_1.z
    .array(
      zod_1.z.object({
        clause: zod_1.z.string(),
        clauseText: zod_1.z.string().nullable().optional(),
        severity: exports.RiskSeveritySchema,
        description: zod_1.z.string(),
        recommendation: zod_1.z.string().nullable().optional(),
        scenario: zod_1.z.string().nullable().optional(),
        suggestedClause: zod_1.z.string().nullable().optional(),
      }),
    )
    .default([]),
});
//# sourceMappingURL=contract.schema.js.map
