export interface BriefParsedDeliverable {
  type: string;
  quantity: number;
  platform?: string | null;
  description?: string | null;
}
export interface BriefParsedDeadline {
  event: string;
  date: string;
}
export interface BriefFtcFlag {
  rule: string;
  warning: string;
}
export interface BriefParsedData {
  deliverables: BriefParsedDeliverable[];
  deadlines: BriefParsedDeadline[];
  dos: string[];
  donts: string[];
  ftcFlags: BriefFtcFlag[];
}
export interface Brief {
  id: string;
  dealId: string;
  fileUrl?: string | null;
  fileKey?: string | null;
  parsedData?: BriefParsedData | null;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=brief.d.ts.map
