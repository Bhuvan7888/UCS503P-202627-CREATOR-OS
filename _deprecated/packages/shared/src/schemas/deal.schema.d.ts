import { z } from 'zod';
export declare const DealStatusSchema: z.ZodEnum<
  ['DRAFT', 'NEGOTIATING', 'PENDING_CONTRACT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED']
>;
export declare const DeliverableTypeSchema: z.ZodEnum<
  [
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
  ]
>;
export declare const DeliverableStatusSchema: z.ZodEnum<
  ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED']
>;
export declare const DeliverableSchema: z.ZodObject<
  {
    id: z.ZodString;
    dealId: z.ZodString;
    type: z.ZodEnum<
      [
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
      ]
    >;
    status: z.ZodDefault<
      z.ZodEnum<['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED']>
    >;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueDate: z.ZodDate;
    submittedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    approvedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    type:
      | 'LIVE_STREAM'
      | 'NEWSLETTER'
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
      | 'UGC_CONTENT'
      | 'OTHER';
    updatedAt: Date;
    dealId: string;
    status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
    dueDate: Date;
    description?: string | null | undefined;
    notes?: string | null | undefined;
    submittedAt?: Date | null | undefined;
    approvedAt?: Date | null | undefined;
    platform?: string | null | undefined;
    contentUrl?: string | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    type:
      | 'LIVE_STREAM'
      | 'NEWSLETTER'
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
      | 'UGC_CONTENT'
      | 'OTHER';
    updatedAt: Date;
    dealId: string;
    dueDate: Date;
    description?: string | null | undefined;
    status?:
      | 'PENDING'
      | 'APPROVED'
      | 'IN_PROGRESS'
      | 'SUBMITTED'
      | 'REVISION_REQUESTED'
      | undefined;
    notes?: string | null | undefined;
    submittedAt?: Date | null | undefined;
    approvedAt?: Date | null | undefined;
    platform?: string | null | undefined;
    contentUrl?: string | null | undefined;
  }
>;
export declare const DealStageSchema: z.ZodEnum<
  [
    'NEW_INQUIRY',
    'QUALIFIED',
    'PITCH_SENT',
    'NEGOTIATING',
    'CONTRACT_SENT',
    'ACTIVE',
    'COMPLETED',
    'LOST',
  ]
>;
export type DealStage = z.infer<typeof DealStageSchema>;
export declare const DealSchema: z.ZodObject<
  {
    id: z.ZodString;
    creatorId: z.ZodString;
    brandName: z.ZodString;
    brandEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    brandWebsite: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    brandInstagram: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dealSource: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    status: z.ZodDefault<
      z.ZodEnum<
        ['DRAFT', 'NEGOTIATING', 'PENDING_CONTRACT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED']
      >
    >;
    stage: z.ZodDefault<
      z.ZodEnum<
        [
          'NEW_INQUIRY',
          'QUALIFIED',
          'PITCH_SENT',
          'NEGOTIATING',
          'CONTRACT_SENT',
          'ACTIVE',
          'COMPLETED',
          'LOST',
        ]
      >
    >;
    quotedAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    offeredAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    deadline: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    followUpReminder: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    exclusivityDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    exclusivityNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    usageRights: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    deliverables: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            dealId: z.ZodString;
            type: z.ZodEnum<
              [
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
              ]
            >;
            status: z.ZodDefault<
              z.ZodEnum<['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED']>
            >;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            dueDate: z.ZodDate;
            submittedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
            approvedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
            platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            contentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
          },
          'strip',
          z.ZodTypeAny,
          {
            id: string;
            createdAt: Date;
            type:
              | 'LIVE_STREAM'
              | 'NEWSLETTER'
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
              | 'UGC_CONTENT'
              | 'OTHER';
            updatedAt: Date;
            dealId: string;
            status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
            dueDate: Date;
            description?: string | null | undefined;
            notes?: string | null | undefined;
            submittedAt?: Date | null | undefined;
            approvedAt?: Date | null | undefined;
            platform?: string | null | undefined;
            contentUrl?: string | null | undefined;
          },
          {
            id: string;
            createdAt: Date;
            type:
              | 'LIVE_STREAM'
              | 'NEWSLETTER'
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
              | 'UGC_CONTENT'
              | 'OTHER';
            updatedAt: Date;
            dealId: string;
            dueDate: Date;
            description?: string | null | undefined;
            status?:
              | 'PENDING'
              | 'APPROVED'
              | 'IN_PROGRESS'
              | 'SUBMITTED'
              | 'REVISION_REQUESTED'
              | undefined;
            notes?: string | null | undefined;
            submittedAt?: Date | null | undefined;
            approvedAt?: Date | null | undefined;
            platform?: string | null | undefined;
            contentUrl?: string | null | undefined;
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
    currency: string;
    tags: string[];
    brandName: string;
    creatorId: string;
    amount: number;
    status:
      | 'COMPLETED'
      | 'DRAFT'
      | 'NEGOTIATING'
      | 'PENDING_CONTRACT'
      | 'ACTIVE'
      | 'CANCELLED'
      | 'DISPUTED';
    stage:
      | 'COMPLETED'
      | 'NEGOTIATING'
      | 'ACTIVE'
      | 'NEW_INQUIRY'
      | 'QUALIFIED'
      | 'PITCH_SENT'
      | 'CONTRACT_SENT'
      | 'LOST';
    deliverables: {
      id: string;
      createdAt: Date;
      type:
        | 'LIVE_STREAM'
        | 'NEWSLETTER'
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
        | 'UGC_CONTENT'
        | 'OTHER';
      updatedAt: Date;
      dealId: string;
      status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
      dueDate: Date;
      description?: string | null | undefined;
      notes?: string | null | undefined;
      submittedAt?: Date | null | undefined;
      approvedAt?: Date | null | undefined;
      platform?: string | null | undefined;
      contentUrl?: string | null | undefined;
    }[];
    description?: string | null | undefined;
    brandEmail?: string | null | undefined;
    brandWebsite?: string | null | undefined;
    brandInstagram?: string | null | undefined;
    dealSource?: string | null | undefined;
    quotedAmount?: number | null | undefined;
    offeredAmount?: number | null | undefined;
    deadline?: Date | null | undefined;
    followUpReminder?: Date | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    exclusivityDays?: number | null | undefined;
    exclusivityNotes?: string | null | undefined;
    usageRights?: string | null | undefined;
    notes?: string | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    title: string;
    updatedAt: Date;
    brandName: string;
    creatorId: string;
    amount: number;
    description?: string | null | undefined;
    currency?: string | undefined;
    tags?: string[] | undefined;
    brandEmail?: string | null | undefined;
    brandWebsite?: string | null | undefined;
    status?:
      | 'COMPLETED'
      | 'DRAFT'
      | 'NEGOTIATING'
      | 'PENDING_CONTRACT'
      | 'ACTIVE'
      | 'CANCELLED'
      | 'DISPUTED'
      | undefined;
    brandInstagram?: string | null | undefined;
    dealSource?: string | null | undefined;
    stage?:
      | 'COMPLETED'
      | 'NEGOTIATING'
      | 'ACTIVE'
      | 'NEW_INQUIRY'
      | 'QUALIFIED'
      | 'PITCH_SENT'
      | 'CONTRACT_SENT'
      | 'LOST'
      | undefined;
    quotedAmount?: number | null | undefined;
    offeredAmount?: number | null | undefined;
    deadline?: Date | null | undefined;
    followUpReminder?: Date | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    exclusivityDays?: number | null | undefined;
    exclusivityNotes?: string | null | undefined;
    usageRights?: string | null | undefined;
    notes?: string | null | undefined;
    deliverables?:
      | {
          id: string;
          createdAt: Date;
          type:
            | 'LIVE_STREAM'
            | 'NEWSLETTER'
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
            | 'UGC_CONTENT'
            | 'OTHER';
          updatedAt: Date;
          dealId: string;
          dueDate: Date;
          description?: string | null | undefined;
          status?:
            | 'PENDING'
            | 'APPROVED'
            | 'IN_PROGRESS'
            | 'SUBMITTED'
            | 'REVISION_REQUESTED'
            | undefined;
          notes?: string | null | undefined;
          submittedAt?: Date | null | undefined;
          approvedAt?: Date | null | undefined;
          platform?: string | null | undefined;
          contentUrl?: string | null | undefined;
        }[]
      | undefined;
  }
>;
export declare const CreateDealSchema: z.ZodObject<
  Omit<
    {
      id: z.ZodString;
      creatorId: z.ZodString;
      brandName: z.ZodString;
      brandEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      brandWebsite: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      brandInstagram: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      dealSource: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      title: z.ZodString;
      description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      amount: z.ZodNumber;
      currency: z.ZodDefault<z.ZodString>;
      status: z.ZodDefault<
        z.ZodEnum<
          [
            'DRAFT',
            'NEGOTIATING',
            'PENDING_CONTRACT',
            'ACTIVE',
            'COMPLETED',
            'CANCELLED',
            'DISPUTED',
          ]
        >
      >;
      stage: z.ZodDefault<
        z.ZodEnum<
          [
            'NEW_INQUIRY',
            'QUALIFIED',
            'PITCH_SENT',
            'NEGOTIATING',
            'CONTRACT_SENT',
            'ACTIVE',
            'COMPLETED',
            'LOST',
          ]
        >
      >;
      quotedAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      offeredAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      startDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      endDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      deadline: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      followUpReminder: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      exclusivityDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      exclusivityNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      usageRights: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      tags: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
      deliverables: z.ZodDefault<
        z.ZodArray<
          z.ZodObject<
            {
              id: z.ZodString;
              dealId: z.ZodString;
              type: z.ZodEnum<
                [
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
                ]
              >;
              status: z.ZodDefault<
                z.ZodEnum<['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED']>
              >;
              description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              dueDate: z.ZodDate;
              submittedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
              approvedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
              platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              contentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              createdAt: z.ZodDate;
              updatedAt: z.ZodDate;
            },
            'strip',
            z.ZodTypeAny,
            {
              id: string;
              createdAt: Date;
              type:
                | 'LIVE_STREAM'
                | 'NEWSLETTER'
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
                | 'UGC_CONTENT'
                | 'OTHER';
              updatedAt: Date;
              dealId: string;
              status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
              dueDate: Date;
              description?: string | null | undefined;
              notes?: string | null | undefined;
              submittedAt?: Date | null | undefined;
              approvedAt?: Date | null | undefined;
              platform?: string | null | undefined;
              contentUrl?: string | null | undefined;
            },
            {
              id: string;
              createdAt: Date;
              type:
                | 'LIVE_STREAM'
                | 'NEWSLETTER'
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
                | 'UGC_CONTENT'
                | 'OTHER';
              updatedAt: Date;
              dealId: string;
              dueDate: Date;
              description?: string | null | undefined;
              status?:
                | 'PENDING'
                | 'APPROVED'
                | 'IN_PROGRESS'
                | 'SUBMITTED'
                | 'REVISION_REQUESTED'
                | undefined;
              notes?: string | null | undefined;
              submittedAt?: Date | null | undefined;
              approvedAt?: Date | null | undefined;
              platform?: string | null | undefined;
              contentUrl?: string | null | undefined;
            }
          >,
          'many'
        >
      >;
      createdAt: z.ZodDate;
      updatedAt: z.ZodDate;
    },
    'id' | 'createdAt' | 'updatedAt' | 'deliverables'
  > & {
    deliverables: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          Omit<
            {
              id: z.ZodString;
              dealId: z.ZodString;
              type: z.ZodEnum<
                [
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
                ]
              >;
              status: z.ZodDefault<
                z.ZodEnum<['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED']>
              >;
              description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              dueDate: z.ZodDate;
              submittedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
              approvedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
              platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              contentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              createdAt: z.ZodDate;
              updatedAt: z.ZodDate;
            },
            'id' | 'createdAt' | 'updatedAt' | 'dealId'
          >,
          'strip',
          z.ZodTypeAny,
          {
            type:
              | 'LIVE_STREAM'
              | 'NEWSLETTER'
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
              | 'UGC_CONTENT'
              | 'OTHER';
            status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
            dueDate: Date;
            description?: string | null | undefined;
            notes?: string | null | undefined;
            submittedAt?: Date | null | undefined;
            approvedAt?: Date | null | undefined;
            platform?: string | null | undefined;
            contentUrl?: string | null | undefined;
          },
          {
            type:
              | 'LIVE_STREAM'
              | 'NEWSLETTER'
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
              | 'UGC_CONTENT'
              | 'OTHER';
            dueDate: Date;
            description?: string | null | undefined;
            status?:
              | 'PENDING'
              | 'APPROVED'
              | 'IN_PROGRESS'
              | 'SUBMITTED'
              | 'REVISION_REQUESTED'
              | undefined;
            notes?: string | null | undefined;
            submittedAt?: Date | null | undefined;
            approvedAt?: Date | null | undefined;
            platform?: string | null | undefined;
            contentUrl?: string | null | undefined;
          }
        >,
        'many'
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    title: string;
    currency: string;
    tags: string[];
    brandName: string;
    creatorId: string;
    amount: number;
    status:
      | 'COMPLETED'
      | 'DRAFT'
      | 'NEGOTIATING'
      | 'PENDING_CONTRACT'
      | 'ACTIVE'
      | 'CANCELLED'
      | 'DISPUTED';
    stage:
      | 'COMPLETED'
      | 'NEGOTIATING'
      | 'ACTIVE'
      | 'NEW_INQUIRY'
      | 'QUALIFIED'
      | 'PITCH_SENT'
      | 'CONTRACT_SENT'
      | 'LOST';
    deliverables: {
      type:
        | 'LIVE_STREAM'
        | 'NEWSLETTER'
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
        | 'UGC_CONTENT'
        | 'OTHER';
      status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
      dueDate: Date;
      description?: string | null | undefined;
      notes?: string | null | undefined;
      submittedAt?: Date | null | undefined;
      approvedAt?: Date | null | undefined;
      platform?: string | null | undefined;
      contentUrl?: string | null | undefined;
    }[];
    description?: string | null | undefined;
    brandEmail?: string | null | undefined;
    brandWebsite?: string | null | undefined;
    brandInstagram?: string | null | undefined;
    dealSource?: string | null | undefined;
    quotedAmount?: number | null | undefined;
    offeredAmount?: number | null | undefined;
    deadline?: Date | null | undefined;
    followUpReminder?: Date | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    exclusivityDays?: number | null | undefined;
    exclusivityNotes?: string | null | undefined;
    usageRights?: string | null | undefined;
    notes?: string | null | undefined;
  },
  {
    title: string;
    brandName: string;
    creatorId: string;
    amount: number;
    description?: string | null | undefined;
    currency?: string | undefined;
    tags?: string[] | undefined;
    brandEmail?: string | null | undefined;
    brandWebsite?: string | null | undefined;
    status?:
      | 'COMPLETED'
      | 'DRAFT'
      | 'NEGOTIATING'
      | 'PENDING_CONTRACT'
      | 'ACTIVE'
      | 'CANCELLED'
      | 'DISPUTED'
      | undefined;
    brandInstagram?: string | null | undefined;
    dealSource?: string | null | undefined;
    stage?:
      | 'COMPLETED'
      | 'NEGOTIATING'
      | 'ACTIVE'
      | 'NEW_INQUIRY'
      | 'QUALIFIED'
      | 'PITCH_SENT'
      | 'CONTRACT_SENT'
      | 'LOST'
      | undefined;
    quotedAmount?: number | null | undefined;
    offeredAmount?: number | null | undefined;
    deadline?: Date | null | undefined;
    followUpReminder?: Date | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    exclusivityDays?: number | null | undefined;
    exclusivityNotes?: string | null | undefined;
    usageRights?: string | null | undefined;
    notes?: string | null | undefined;
    deliverables?:
      | {
          type:
            | 'LIVE_STREAM'
            | 'NEWSLETTER'
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
            | 'UGC_CONTENT'
            | 'OTHER';
          dueDate: Date;
          description?: string | null | undefined;
          status?:
            | 'PENDING'
            | 'APPROVED'
            | 'IN_PROGRESS'
            | 'SUBMITTED'
            | 'REVISION_REQUESTED'
            | undefined;
          notes?: string | null | undefined;
          submittedAt?: Date | null | undefined;
          approvedAt?: Date | null | undefined;
          platform?: string | null | undefined;
          contentUrl?: string | null | undefined;
        }[]
      | undefined;
  }
>;
export declare const UpdateDealSchema: z.ZodObject<
  {
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    title: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>>;
    brandName: z.ZodOptional<z.ZodString>;
    brandEmail: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    creatorId: z.ZodOptional<z.ZodString>;
    brandWebsite: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    amount: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<
      z.ZodDefault<
        z.ZodEnum<
          [
            'DRAFT',
            'NEGOTIATING',
            'PENDING_CONTRACT',
            'ACTIVE',
            'COMPLETED',
            'CANCELLED',
            'DISPUTED',
          ]
        >
      >
    >;
    brandInstagram: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    dealSource: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    stage: z.ZodOptional<
      z.ZodDefault<
        z.ZodEnum<
          [
            'NEW_INQUIRY',
            'QUALIFIED',
            'PITCH_SENT',
            'NEGOTIATING',
            'CONTRACT_SENT',
            'ACTIVE',
            'COMPLETED',
            'LOST',
          ]
        >
      >
    >;
    quotedAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    offeredAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    deadline: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    followUpReminder: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    startDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    exclusivityDays: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    exclusivityNotes: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    usageRights: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    deliverables: z.ZodOptional<
      z.ZodDefault<
        z.ZodArray<
          z.ZodObject<
            Omit<
              {
                id: z.ZodString;
                dealId: z.ZodString;
                type: z.ZodEnum<
                  [
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
                  ]
                >;
                status: z.ZodDefault<
                  z.ZodEnum<
                    ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED']
                  >
                >;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                dueDate: z.ZodDate;
                submittedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                approvedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                contentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
              },
              'id' | 'createdAt' | 'updatedAt' | 'dealId'
            >,
            'strip',
            z.ZodTypeAny,
            {
              type:
                | 'LIVE_STREAM'
                | 'NEWSLETTER'
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
                | 'UGC_CONTENT'
                | 'OTHER';
              status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
              dueDate: Date;
              description?: string | null | undefined;
              notes?: string | null | undefined;
              submittedAt?: Date | null | undefined;
              approvedAt?: Date | null | undefined;
              platform?: string | null | undefined;
              contentUrl?: string | null | undefined;
            },
            {
              type:
                | 'LIVE_STREAM'
                | 'NEWSLETTER'
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
                | 'UGC_CONTENT'
                | 'OTHER';
              dueDate: Date;
              description?: string | null | undefined;
              status?:
                | 'PENDING'
                | 'APPROVED'
                | 'IN_PROGRESS'
                | 'SUBMITTED'
                | 'REVISION_REQUESTED'
                | undefined;
              notes?: string | null | undefined;
              submittedAt?: Date | null | undefined;
              approvedAt?: Date | null | undefined;
              platform?: string | null | undefined;
              contentUrl?: string | null | undefined;
            }
          >,
          'many'
        >
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    description?: string | null | undefined;
    title?: string | undefined;
    currency?: string | undefined;
    tags?: string[] | undefined;
    brandName?: string | undefined;
    brandEmail?: string | null | undefined;
    creatorId?: string | undefined;
    brandWebsite?: string | null | undefined;
    amount?: number | undefined;
    status?:
      | 'COMPLETED'
      | 'DRAFT'
      | 'NEGOTIATING'
      | 'PENDING_CONTRACT'
      | 'ACTIVE'
      | 'CANCELLED'
      | 'DISPUTED'
      | undefined;
    brandInstagram?: string | null | undefined;
    dealSource?: string | null | undefined;
    stage?:
      | 'COMPLETED'
      | 'NEGOTIATING'
      | 'ACTIVE'
      | 'NEW_INQUIRY'
      | 'QUALIFIED'
      | 'PITCH_SENT'
      | 'CONTRACT_SENT'
      | 'LOST'
      | undefined;
    quotedAmount?: number | null | undefined;
    offeredAmount?: number | null | undefined;
    deadline?: Date | null | undefined;
    followUpReminder?: Date | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    exclusivityDays?: number | null | undefined;
    exclusivityNotes?: string | null | undefined;
    usageRights?: string | null | undefined;
    notes?: string | null | undefined;
    deliverables?:
      | {
          type:
            | 'LIVE_STREAM'
            | 'NEWSLETTER'
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
            | 'UGC_CONTENT'
            | 'OTHER';
          status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED';
          dueDate: Date;
          description?: string | null | undefined;
          notes?: string | null | undefined;
          submittedAt?: Date | null | undefined;
          approvedAt?: Date | null | undefined;
          platform?: string | null | undefined;
          contentUrl?: string | null | undefined;
        }[]
      | undefined;
  },
  {
    description?: string | null | undefined;
    title?: string | undefined;
    currency?: string | undefined;
    tags?: string[] | undefined;
    brandName?: string | undefined;
    brandEmail?: string | null | undefined;
    creatorId?: string | undefined;
    brandWebsite?: string | null | undefined;
    amount?: number | undefined;
    status?:
      | 'COMPLETED'
      | 'DRAFT'
      | 'NEGOTIATING'
      | 'PENDING_CONTRACT'
      | 'ACTIVE'
      | 'CANCELLED'
      | 'DISPUTED'
      | undefined;
    brandInstagram?: string | null | undefined;
    dealSource?: string | null | undefined;
    stage?:
      | 'COMPLETED'
      | 'NEGOTIATING'
      | 'ACTIVE'
      | 'NEW_INQUIRY'
      | 'QUALIFIED'
      | 'PITCH_SENT'
      | 'CONTRACT_SENT'
      | 'LOST'
      | undefined;
    quotedAmount?: number | null | undefined;
    offeredAmount?: number | null | undefined;
    deadline?: Date | null | undefined;
    followUpReminder?: Date | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    exclusivityDays?: number | null | undefined;
    exclusivityNotes?: string | null | undefined;
    usageRights?: string | null | undefined;
    notes?: string | null | undefined;
    deliverables?:
      | {
          type:
            | 'LIVE_STREAM'
            | 'NEWSLETTER'
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
            | 'UGC_CONTENT'
            | 'OTHER';
          dueDate: Date;
          description?: string | null | undefined;
          status?:
            | 'PENDING'
            | 'APPROVED'
            | 'IN_PROGRESS'
            | 'SUBMITTED'
            | 'REVISION_REQUESTED'
            | undefined;
          notes?: string | null | undefined;
          submittedAt?: Date | null | undefined;
          approvedAt?: Date | null | undefined;
          platform?: string | null | undefined;
          contentUrl?: string | null | undefined;
        }[]
      | undefined;
  }
>;
//# sourceMappingURL=deal.schema.d.ts.map
