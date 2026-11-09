import { z } from 'zod';
export declare const ContractStatusSchema: z.ZodEnum<
  ['DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED']
>;
export declare const RiskSeveritySchema: z.ZodEnum<['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']>;
export declare const ContractRiskFlagSchema: z.ZodObject<
  {
    id: z.ZodString;
    contractId: z.ZodString;
    clause: z.ZodString;
    clauseText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    severity: z.ZodEnum<['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']>;
    description: z.ZodString;
    recommendation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    scenario: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    suggestedClause: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pageNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isAcknowledged: z.ZodDefault<z.ZodBoolean>;
    acknowledgedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    createdAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    description: string;
    contractId: string;
    clause: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    isAcknowledged: boolean;
    clauseText?: string | null | undefined;
    recommendation?: string | null | undefined;
    scenario?: string | null | undefined;
    suggestedClause?: string | null | undefined;
    pageNumber?: number | null | undefined;
    acknowledgedAt?: Date | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    description: string;
    contractId: string;
    clause: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    clauseText?: string | null | undefined;
    recommendation?: string | null | undefined;
    scenario?: string | null | undefined;
    suggestedClause?: string | null | undefined;
    pageNumber?: number | null | undefined;
    isAcknowledged?: boolean | undefined;
    acknowledgedAt?: Date | null | undefined;
  }
>;
export declare const ContractSchema: z.ZodObject<
  {
    id: z.ZodString;
    dealId: z.ZodString;
    creatorId: z.ZodString;
    title: z.ZodString;
    fileUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fileKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<
      z.ZodEnum<['DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED']>
    >;
    signedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    parties: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    jurisdiction: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    governingLaw: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    aiSummary: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    overallRiskScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    riskFlags: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            contractId: z.ZodString;
            clause: z.ZodString;
            clauseText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            severity: z.ZodEnum<['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']>;
            description: z.ZodString;
            recommendation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            scenario: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            suggestedClause: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            pageNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            isAcknowledged: z.ZodDefault<z.ZodBoolean>;
            acknowledgedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
            createdAt: z.ZodDate;
          },
          'strip',
          z.ZodTypeAny,
          {
            id: string;
            createdAt: Date;
            description: string;
            contractId: string;
            clause: string;
            severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            isAcknowledged: boolean;
            clauseText?: string | null | undefined;
            recommendation?: string | null | undefined;
            scenario?: string | null | undefined;
            suggestedClause?: string | null | undefined;
            pageNumber?: number | null | undefined;
            acknowledgedAt?: Date | null | undefined;
          },
          {
            id: string;
            createdAt: Date;
            description: string;
            contractId: string;
            clause: string;
            severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            clauseText?: string | null | undefined;
            recommendation?: string | null | undefined;
            scenario?: string | null | undefined;
            suggestedClause?: string | null | undefined;
            pageNumber?: number | null | undefined;
            isAcknowledged?: boolean | undefined;
            acknowledgedAt?: Date | null | undefined;
          }
        >,
        'many'
      >
    >;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    title: string;
    updatedAt: Date;
    dealId: string;
    creatorId: string;
    status: 'PENDING_REVIEW' | 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'TERMINATED';
    parties: string[];
    riskFlags: {
      id: string;
      createdAt: Date;
      description: string;
      contractId: string;
      clause: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      isAcknowledged: boolean;
      clauseText?: string | null | undefined;
      recommendation?: string | null | undefined;
      scenario?: string | null | undefined;
      suggestedClause?: string | null | undefined;
      pageNumber?: number | null | undefined;
      acknowledgedAt?: Date | null | undefined;
    }[];
    expiresAt?: Date | null | undefined;
    fileUrl?: string | null | undefined;
    fileKey?: string | null | undefined;
    governingLaw?: string | null | undefined;
    signedAt?: Date | null | undefined;
    jurisdiction?: string | null | undefined;
    aiSummary?: string | null | undefined;
    overallRiskScore?: number | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    title: string;
    updatedAt: Date;
    dealId: string;
    creatorId: string;
    expiresAt?: Date | null | undefined;
    fileUrl?: string | null | undefined;
    fileKey?: string | null | undefined;
    status?:
      | 'PENDING_REVIEW'
      | 'DRAFT'
      | 'PENDING_SIGNATURE'
      | 'SIGNED'
      | 'EXPIRED'
      | 'TERMINATED'
      | undefined;
    governingLaw?: string | null | undefined;
    signedAt?: Date | null | undefined;
    parties?: string[] | undefined;
    jurisdiction?: string | null | undefined;
    aiSummary?: string | null | undefined;
    overallRiskScore?: number | null | undefined;
    riskFlags?:
      | {
          id: string;
          createdAt: Date;
          description: string;
          contractId: string;
          clause: string;
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          clauseText?: string | null | undefined;
          recommendation?: string | null | undefined;
          scenario?: string | null | undefined;
          suggestedClause?: string | null | undefined;
          pageNumber?: number | null | undefined;
          isAcknowledged?: boolean | undefined;
          acknowledgedAt?: Date | null | undefined;
        }[]
      | undefined;
  }
>;
export declare const UpdateContractSchema: z.ZodObject<
  {
    title: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    fileUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    fileKey: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<
      z.ZodDefault<
        z.ZodEnum<
          ['DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED']
        >
      >
    >;
    governingLaw: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    signedAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    parties: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>>;
    jurisdiction: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    aiSummary: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    overallRiskScore: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    title?: string | undefined;
    expiresAt?: Date | null | undefined;
    fileUrl?: string | null | undefined;
    fileKey?: string | null | undefined;
    status?:
      | 'PENDING_REVIEW'
      | 'DRAFT'
      | 'PENDING_SIGNATURE'
      | 'SIGNED'
      | 'EXPIRED'
      | 'TERMINATED'
      | undefined;
    governingLaw?: string | null | undefined;
    signedAt?: Date | null | undefined;
    parties?: string[] | undefined;
    jurisdiction?: string | null | undefined;
    aiSummary?: string | null | undefined;
    overallRiskScore?: number | null | undefined;
  },
  {
    title?: string | undefined;
    expiresAt?: Date | null | undefined;
    fileUrl?: string | null | undefined;
    fileKey?: string | null | undefined;
    status?:
      | 'PENDING_REVIEW'
      | 'DRAFT'
      | 'PENDING_SIGNATURE'
      | 'SIGNED'
      | 'EXPIRED'
      | 'TERMINATED'
      | undefined;
    governingLaw?: string | null | undefined;
    signedAt?: Date | null | undefined;
    parties?: string[] | undefined;
    jurisdiction?: string | null | undefined;
    aiSummary?: string | null | undefined;
    overallRiskScore?: number | null | undefined;
  }
>;
export declare const CreateContractGenerationSchema: z.ZodObject<
  {
    brandName: z.ZodString;
    creatorName: z.ZodString;
    dealId: z.ZodOptional<z.ZodString>;
    contractType: z.ZodDefault<
      z.ZodEnum<['SPONSORED_POST', 'UGC', 'AMBASSADOR', 'AFFILIATE', 'OTHER']>
    >;
    exclusivityDays: z.ZodDefault<z.ZodNumber>;
    exclusivityScope: z.ZodOptional<z.ZodString>;
    usageRightsScope: z.ZodDefault<z.ZodString>;
    killFeePercent: z.ZodDefault<z.ZodNumber>;
    revisionLimit: z.ZodDefault<z.ZodNumber>;
    latePaymentPenaltyPercent: z.ZodDefault<z.ZodNumber>;
    latePaymentPenaltyToggle: z.ZodDefault<z.ZodBoolean>;
    includeFtcDisclosure: z.ZodDefault<z.ZodBoolean>;
    governingLaw: z.ZodDefault<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    brandName: string;
    exclusivityDays: number;
    creatorName: string;
    contractType: 'OTHER' | 'SPONSORED_POST' | 'UGC' | 'AMBASSADOR' | 'AFFILIATE';
    usageRightsScope: string;
    killFeePercent: number;
    revisionLimit: number;
    latePaymentPenaltyPercent: number;
    latePaymentPenaltyToggle: boolean;
    includeFtcDisclosure: boolean;
    governingLaw: string;
    dealId?: string | undefined;
    exclusivityScope?: string | undefined;
  },
  {
    brandName: string;
    creatorName: string;
    dealId?: string | undefined;
    exclusivityDays?: number | undefined;
    contractType?: 'OTHER' | 'SPONSORED_POST' | 'UGC' | 'AMBASSADOR' | 'AFFILIATE' | undefined;
    exclusivityScope?: string | undefined;
    usageRightsScope?: string | undefined;
    killFeePercent?: number | undefined;
    revisionLimit?: number | undefined;
    latePaymentPenaltyPercent?: number | undefined;
    latePaymentPenaltyToggle?: boolean | undefined;
    includeFtcDisclosure?: boolean | undefined;
    governingLaw?: string | undefined;
  }
>;
export declare const ContractAnalysisResultSchema: z.ZodObject<
  {
    overallRiskScore: z.ZodNumber;
    summary: z.ZodString;
    parties: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    jurisdiction: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    governingLaw: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    riskFlags: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            clause: z.ZodString;
            clauseText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            severity: z.ZodEnum<['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']>;
            description: z.ZodString;
            recommendation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            scenario: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            suggestedClause: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            description: string;
            clause: string;
            severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            clauseText?: string | null | undefined;
            recommendation?: string | null | undefined;
            scenario?: string | null | undefined;
            suggestedClause?: string | null | undefined;
          },
          {
            description: string;
            clause: string;
            severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            clauseText?: string | null | undefined;
            recommendation?: string | null | undefined;
            scenario?: string | null | undefined;
            suggestedClause?: string | null | undefined;
          }
        >,
        'many'
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    summary: string;
    parties: string[];
    overallRiskScore: number;
    riskFlags: {
      description: string;
      clause: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      clauseText?: string | null | undefined;
      recommendation?: string | null | undefined;
      scenario?: string | null | undefined;
      suggestedClause?: string | null | undefined;
    }[];
    governingLaw?: string | null | undefined;
    jurisdiction?: string | null | undefined;
  },
  {
    summary: string;
    overallRiskScore: number;
    governingLaw?: string | null | undefined;
    parties?: string[] | undefined;
    jurisdiction?: string | null | undefined;
    riskFlags?:
      | {
          description: string;
          clause: string;
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          clauseText?: string | null | undefined;
          recommendation?: string | null | undefined;
          scenario?: string | null | undefined;
          suggestedClause?: string | null | undefined;
        }[]
      | undefined;
  }
>;
export type CreateContractGenerationInput = z.infer<typeof CreateContractGenerationSchema>;
export type ContractAnalysisResult = z.infer<typeof ContractAnalysisResultSchema>;
//# sourceMappingURL=contract.schema.d.ts.map
