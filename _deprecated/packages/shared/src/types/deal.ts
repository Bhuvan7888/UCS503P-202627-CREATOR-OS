export type DealStage =
  | 'NEW_INQUIRY'
  | 'QUALIFIED'
  | 'PITCH_SENT'
  | 'NEGOTIATING'
  | 'CONTRACT_SENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'LOST';

export type DealStatus =
  | 'DRAFT'
  | 'NEGOTIATING'
  | 'PENDING_CONTRACT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type DeliverableType =
  | 'INSTAGRAM_POST'
  | 'INSTAGRAM_REEL'
  | 'INSTAGRAM_STORY'
  | 'YOUTUBE_VIDEO'
  | 'YOUTUBE_SHORT'
  | 'TIKTOK_VIDEO'
  | 'TWITTER_POST'
  | 'LINKEDIN_POST'
  | 'BLOG_POST'
  | 'PODCAST_MENTION'
  | 'LIVE_STREAM'
  | 'NEWSLETTER'
  | 'UGC_CONTENT'
  | 'OTHER';

export type DeliverableStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REVISION_REQUESTED';

export interface Deliverable {
  id: string;
  dealId: string;
  type: DeliverableType;
  status: DeliverableStatus;
  description?: string | null;
  dueDate: Date;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  platform?: string | null;
  contentUrl?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  creatorId: string;
  brandName: string;
  brandEmail?: string | null;
  brandWebsite?: string | null;
  brandInstagram?: string | null;
  dealSource?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  status: DealStatus;
  stage: DealStage;
  quotedAmount?: number | null;
  offeredAmount?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  deadline?: Date | null;
  followUpReminder?: Date | null;
  exclusivityDays?: number | null;
  exclusivityNotes?: string | null;
  usageRights?: string | null;
  notes?: string | null;
  tags: string[];
  deliverables: Deliverable[];
  createdAt: Date;
  updatedAt: Date;
}
