import { z } from 'zod';
export declare const PerformanceMetricsSchema: z.ZodObject<
  {
    views: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    impressions: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    reach: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    likes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    comments: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    shares: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    saves: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    clicks: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    conversions: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    revenue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    engagementRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    ctr: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    conversionRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    comments?: number | null | undefined;
    views?: number | null | undefined;
    impressions?: number | null | undefined;
    reach?: number | null | undefined;
    likes?: number | null | undefined;
    shares?: number | null | undefined;
    saves?: number | null | undefined;
    clicks?: number | null | undefined;
    conversions?: number | null | undefined;
    revenue?: number | null | undefined;
    engagementRate?: number | null | undefined;
    ctr?: number | null | undefined;
    conversionRate?: number | null | undefined;
  },
  {
    comments?: number | null | undefined;
    views?: number | null | undefined;
    impressions?: number | null | undefined;
    reach?: number | null | undefined;
    likes?: number | null | undefined;
    shares?: number | null | undefined;
    saves?: number | null | undefined;
    clicks?: number | null | undefined;
    conversions?: number | null | undefined;
    revenue?: number | null | undefined;
    engagementRate?: number | null | undefined;
    ctr?: number | null | undefined;
    conversionRate?: number | null | undefined;
  }
>;
export declare const PerformanceLogSchema: z.ZodObject<
  {
    id: z.ZodString;
    dealId: z.ZodString;
    deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    creatorId: z.ZodString;
    recordedAt: z.ZodDate;
    metrics: z.ZodObject<
      {
        views: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        impressions: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        reach: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        likes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        comments: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        shares: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        saves: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        clicks: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        conversions: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        revenue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        engagementRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        ctr: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        conversionRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        comments?: number | null | undefined;
        views?: number | null | undefined;
        impressions?: number | null | undefined;
        reach?: number | null | undefined;
        likes?: number | null | undefined;
        shares?: number | null | undefined;
        saves?: number | null | undefined;
        clicks?: number | null | undefined;
        conversions?: number | null | undefined;
        revenue?: number | null | undefined;
        engagementRate?: number | null | undefined;
        ctr?: number | null | undefined;
        conversionRate?: number | null | undefined;
      },
      {
        comments?: number | null | undefined;
        views?: number | null | undefined;
        impressions?: number | null | undefined;
        reach?: number | null | undefined;
        likes?: number | null | undefined;
        shares?: number | null | undefined;
        saves?: number | null | undefined;
        clicks?: number | null | undefined;
        conversions?: number | null | undefined;
        revenue?: number | null | undefined;
        engagementRate?: number | null | undefined;
        ctr?: number | null | undefined;
        conversionRate?: number | null | undefined;
      }
    >;
    source: z.ZodDefault<z.ZodEnum<['MANUAL', 'API_SYNC', 'IMPORT']>>;
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
    updatedAt: Date;
    dealId: string;
    creatorId: string;
    recordedAt: Date;
    metrics: {
      comments?: number | null | undefined;
      views?: number | null | undefined;
      impressions?: number | null | undefined;
      reach?: number | null | undefined;
      likes?: number | null | undefined;
      shares?: number | null | undefined;
      saves?: number | null | undefined;
      clicks?: number | null | undefined;
      conversions?: number | null | undefined;
      revenue?: number | null | undefined;
      engagementRate?: number | null | undefined;
      ctr?: number | null | undefined;
      conversionRate?: number | null | undefined;
    };
    source: 'MANUAL' | 'API_SYNC' | 'IMPORT';
    notes?: string | null | undefined;
    platform?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    dealId: string;
    creatorId: string;
    recordedAt: Date;
    metrics: {
      comments?: number | null | undefined;
      views?: number | null | undefined;
      impressions?: number | null | undefined;
      reach?: number | null | undefined;
      likes?: number | null | undefined;
      shares?: number | null | undefined;
      saves?: number | null | undefined;
      clicks?: number | null | undefined;
      conversions?: number | null | undefined;
      revenue?: number | null | undefined;
      engagementRate?: number | null | undefined;
      ctr?: number | null | undefined;
      conversionRate?: number | null | undefined;
    };
    notes?: string | null | undefined;
    platform?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    source?: 'MANUAL' | 'API_SYNC' | 'IMPORT' | undefined;
  }
>;
export declare const CreatePerformanceLogSchema: z.ZodObject<
  Omit<
    {
      id: z.ZodString;
      dealId: z.ZodString;
      deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      creatorId: z.ZodString;
      recordedAt: z.ZodDate;
      metrics: z.ZodObject<
        {
          views: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          impressions: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          reach: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          likes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          comments: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          shares: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          saves: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          clicks: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          conversions: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          revenue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          engagementRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          ctr: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          conversionRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          comments?: number | null | undefined;
          views?: number | null | undefined;
          impressions?: number | null | undefined;
          reach?: number | null | undefined;
          likes?: number | null | undefined;
          shares?: number | null | undefined;
          saves?: number | null | undefined;
          clicks?: number | null | undefined;
          conversions?: number | null | undefined;
          revenue?: number | null | undefined;
          engagementRate?: number | null | undefined;
          ctr?: number | null | undefined;
          conversionRate?: number | null | undefined;
        },
        {
          comments?: number | null | undefined;
          views?: number | null | undefined;
          impressions?: number | null | undefined;
          reach?: number | null | undefined;
          likes?: number | null | undefined;
          shares?: number | null | undefined;
          saves?: number | null | undefined;
          clicks?: number | null | undefined;
          conversions?: number | null | undefined;
          revenue?: number | null | undefined;
          engagementRate?: number | null | undefined;
          ctr?: number | null | undefined;
          conversionRate?: number | null | undefined;
        }
      >;
      source: z.ZodDefault<z.ZodEnum<['MANUAL', 'API_SYNC', 'IMPORT']>>;
      platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      contentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      createdAt: z.ZodDate;
      updatedAt: z.ZodDate;
    },
    'id' | 'createdAt' | 'updatedAt'
  >,
  'strip',
  z.ZodTypeAny,
  {
    dealId: string;
    creatorId: string;
    recordedAt: Date;
    metrics: {
      comments?: number | null | undefined;
      views?: number | null | undefined;
      impressions?: number | null | undefined;
      reach?: number | null | undefined;
      likes?: number | null | undefined;
      shares?: number | null | undefined;
      saves?: number | null | undefined;
      clicks?: number | null | undefined;
      conversions?: number | null | undefined;
      revenue?: number | null | undefined;
      engagementRate?: number | null | undefined;
      ctr?: number | null | undefined;
      conversionRate?: number | null | undefined;
    };
    source: 'MANUAL' | 'API_SYNC' | 'IMPORT';
    notes?: string | null | undefined;
    platform?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
  },
  {
    dealId: string;
    creatorId: string;
    recordedAt: Date;
    metrics: {
      comments?: number | null | undefined;
      views?: number | null | undefined;
      impressions?: number | null | undefined;
      reach?: number | null | undefined;
      likes?: number | null | undefined;
      shares?: number | null | undefined;
      saves?: number | null | undefined;
      clicks?: number | null | undefined;
      conversions?: number | null | undefined;
      revenue?: number | null | undefined;
      engagementRate?: number | null | undefined;
      ctr?: number | null | undefined;
      conversionRate?: number | null | undefined;
    };
    notes?: string | null | undefined;
    platform?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    source?: 'MANUAL' | 'API_SYNC' | 'IMPORT' | undefined;
  }
>;
//# sourceMappingURL=performance.schema.d.ts.map
