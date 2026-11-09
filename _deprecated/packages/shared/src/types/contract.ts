export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'EXPIRED'
  | 'TERMINATED';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ContractRiskFlag {
  id: string;
  contractId: string;
  clause: string;
  clauseText?: string | null;
  severity: RiskSeverity;
  description: string;
  recommendation?: string | null;
  scenario?: string | null;
  suggestedClause?: string | null;
  pageNumber?: number | null;
  isAcknowledged: boolean;
  acknowledgedAt?: Date | null;
  createdAt: Date;
}

export interface Contract {
  id: string;
  dealId: string;
  creatorId: string;
  title: string;
  fileUrl?: string | null;
  fileKey?: string | null;
  status: ContractStatus;
  signedAt?: Date | null;
  expiresAt?: Date | null;
  parties: string[];
  jurisdiction?: string | null;
  governingLaw?: string | null;
  aiSummary?: string | null;
  overallRiskScore?: number | null;
  riskFlags: ContractRiskFlag[];
  createdAt: Date;
  updatedAt: Date;
}
