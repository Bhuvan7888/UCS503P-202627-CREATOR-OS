import { z } from 'zod';
export declare const CreatePerformanceLogObject: z.ZodObject<
  {
    dealId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deliverableId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    platform: z.ZodEnum<
      ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
    >;
    contentFormat: z.ZodEnum<
      [
        'SHORT_FORM_VIDEO',
        'LONG_FORM_VIDEO',
        'STATIC_IMAGE',
        'CAROUSEL',
        'STORIES',
        'LIVE_STREAM',
        'PODCAST',
        'BLOG_ARTICLE',
        'NEWSLETTER',
        'UGC_RAW_FOOTAGE',
      ]
    >;
    recordedAt: z.ZodString;
    contentUrl: z.ZodNullable<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    views: z.ZodNumber;
    likes: z.ZodNumber;
    comments: z.ZodNumber;
    saves: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    shares: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    watchTimePercent: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    isPaid: z.ZodDefault<z.ZodBoolean>;
    brandCategory: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    comments: number;
    platform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    views: number;
    likes: number;
    shares: number;
    saves: number;
    recordedAt: string;
    contentFormat:
      | 'PODCAST'
      | 'SHORT_FORM_VIDEO'
      | 'LONG_FORM_VIDEO'
      | 'STATIC_IMAGE'
      | 'CAROUSEL'
      | 'STORIES'
      | 'LIVE_STREAM'
      | 'BLOG_ARTICLE'
      | 'NEWSLETTER'
      | 'UGC_RAW_FOOTAGE';
    isPaid: boolean;
    dealId?: string | null | undefined;
    notes?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    brandCategory?: string | null | undefined;
    watchTimePercent?: number | null | undefined;
  },
  {
    comments: number;
    platform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    views: number;
    likes: number;
    recordedAt: string;
    contentFormat:
      | 'PODCAST'
      | 'SHORT_FORM_VIDEO'
      | 'LONG_FORM_VIDEO'
      | 'STATIC_IMAGE'
      | 'CAROUSEL'
      | 'STORIES'
      | 'LIVE_STREAM'
      | 'BLOG_ARTICLE'
      | 'NEWSLETTER'
      | 'UGC_RAW_FOOTAGE';
    dealId?: string | null | undefined;
    notes?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    shares?: number | undefined;
    saves?: number | undefined;
    brandCategory?: string | null | undefined;
    watchTimePercent?: number | null | undefined;
    isPaid?: boolean | undefined;
  }
>;
export declare const CreatePerformanceLogSchema: z.ZodEffects<
  z.ZodObject<
    {
      dealId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
      deliverableId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
      platform: z.ZodEnum<
        ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
      >;
      contentFormat: z.ZodEnum<
        [
          'SHORT_FORM_VIDEO',
          'LONG_FORM_VIDEO',
          'STATIC_IMAGE',
          'CAROUSEL',
          'STORIES',
          'LIVE_STREAM',
          'PODCAST',
          'BLOG_ARTICLE',
          'NEWSLETTER',
          'UGC_RAW_FOOTAGE',
        ]
      >;
      recordedAt: z.ZodString;
      contentUrl: z.ZodNullable<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]>>;
      notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
      views: z.ZodNumber;
      likes: z.ZodNumber;
      comments: z.ZodNumber;
      saves: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
      shares: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
      watchTimePercent: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
      isPaid: z.ZodDefault<z.ZodBoolean>;
      brandCategory: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    },
    'strip',
    z.ZodTypeAny,
    {
      comments: number;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      views: number;
      likes: number;
      shares: number;
      saves: number;
      recordedAt: string;
      contentFormat:
        | 'PODCAST'
        | 'SHORT_FORM_VIDEO'
        | 'LONG_FORM_VIDEO'
        | 'STATIC_IMAGE'
        | 'CAROUSEL'
        | 'STORIES'
        | 'LIVE_STREAM'
        | 'BLOG_ARTICLE'
        | 'NEWSLETTER'
        | 'UGC_RAW_FOOTAGE';
      isPaid: boolean;
      dealId?: string | null | undefined;
      notes?: string | null | undefined;
      contentUrl?: string | null | undefined;
      deliverableId?: string | null | undefined;
      brandCategory?: string | null | undefined;
      watchTimePercent?: number | null | undefined;
    },
    {
      comments: number;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      views: number;
      likes: number;
      recordedAt: string;
      contentFormat:
        | 'PODCAST'
        | 'SHORT_FORM_VIDEO'
        | 'LONG_FORM_VIDEO'
        | 'STATIC_IMAGE'
        | 'CAROUSEL'
        | 'STORIES'
        | 'LIVE_STREAM'
        | 'BLOG_ARTICLE'
        | 'NEWSLETTER'
        | 'UGC_RAW_FOOTAGE';
      dealId?: string | null | undefined;
      notes?: string | null | undefined;
      contentUrl?: string | null | undefined;
      deliverableId?: string | null | undefined;
      shares?: number | undefined;
      saves?: number | undefined;
      brandCategory?: string | null | undefined;
      watchTimePercent?: number | null | undefined;
      isPaid?: boolean | undefined;
    }
  >,
  {
    comments: number;
    platform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    views: number;
    likes: number;
    shares: number;
    saves: number;
    recordedAt: string;
    contentFormat:
      | 'PODCAST'
      | 'SHORT_FORM_VIDEO'
      | 'LONG_FORM_VIDEO'
      | 'STATIC_IMAGE'
      | 'CAROUSEL'
      | 'STORIES'
      | 'LIVE_STREAM'
      | 'BLOG_ARTICLE'
      | 'NEWSLETTER'
      | 'UGC_RAW_FOOTAGE';
    isPaid: boolean;
    dealId?: string | null | undefined;
    notes?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    brandCategory?: string | null | undefined;
    watchTimePercent?: number | null | undefined;
  },
  {
    comments: number;
    platform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    views: number;
    likes: number;
    recordedAt: string;
    contentFormat:
      | 'PODCAST'
      | 'SHORT_FORM_VIDEO'
      | 'LONG_FORM_VIDEO'
      | 'STATIC_IMAGE'
      | 'CAROUSEL'
      | 'STORIES'
      | 'LIVE_STREAM'
      | 'BLOG_ARTICLE'
      | 'NEWSLETTER'
      | 'UGC_RAW_FOOTAGE';
    dealId?: string | null | undefined;
    notes?: string | null | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    shares?: number | undefined;
    saves?: number | undefined;
    brandCategory?: string | null | undefined;
    watchTimePercent?: number | null | undefined;
    isPaid?: boolean | undefined;
  }
>;
export type CreatePerformanceLog = z.infer<typeof CreatePerformanceLogSchema>;
export declare const UpdatePerformanceLogSchema: z.ZodObject<
  Omit<
    {
      dealId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
      deliverableId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
      platform: z.ZodOptional<
        z.ZodEnum<
          [
            'INSTAGRAM',
            'YOUTUBE',
            'TIKTOK',
            'TWITTER',
            'LINKEDIN',
            'TWITCH',
            'PINTEREST',
            'PODCAST',
          ]
        >
      >;
      contentFormat: z.ZodOptional<
        z.ZodEnum<
          [
            'SHORT_FORM_VIDEO',
            'LONG_FORM_VIDEO',
            'STATIC_IMAGE',
            'CAROUSEL',
            'STORIES',
            'LIVE_STREAM',
            'PODCAST',
            'BLOG_ARTICLE',
            'NEWSLETTER',
            'UGC_RAW_FOOTAGE',
          ]
        >
      >;
      recordedAt: z.ZodOptional<z.ZodString>;
      contentUrl: z.ZodOptional<
        z.ZodNullable<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]>>
      >;
      notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
      views: z.ZodOptional<z.ZodNumber>;
      likes: z.ZodOptional<z.ZodNumber>;
      comments: z.ZodOptional<z.ZodNumber>;
      saves: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
      shares: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
      watchTimePercent: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
      isPaid: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
      brandCategory: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    },
    'dealId'
  >,
  'strip',
  z.ZodTypeAny,
  {
    notes?: string | null | undefined;
    comments?: number | undefined;
    platform?:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST'
      | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    views?: number | undefined;
    likes?: number | undefined;
    shares?: number | undefined;
    saves?: number | undefined;
    recordedAt?: string | undefined;
    contentFormat?:
      | 'PODCAST'
      | 'SHORT_FORM_VIDEO'
      | 'LONG_FORM_VIDEO'
      | 'STATIC_IMAGE'
      | 'CAROUSEL'
      | 'STORIES'
      | 'LIVE_STREAM'
      | 'BLOG_ARTICLE'
      | 'NEWSLETTER'
      | 'UGC_RAW_FOOTAGE'
      | undefined;
    brandCategory?: string | null | undefined;
    watchTimePercent?: number | null | undefined;
    isPaid?: boolean | undefined;
  },
  {
    notes?: string | null | undefined;
    comments?: number | undefined;
    platform?:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST'
      | undefined;
    contentUrl?: string | null | undefined;
    deliverableId?: string | null | undefined;
    views?: number | undefined;
    likes?: number | undefined;
    shares?: number | undefined;
    saves?: number | undefined;
    recordedAt?: string | undefined;
    contentFormat?:
      | 'PODCAST'
      | 'SHORT_FORM_VIDEO'
      | 'LONG_FORM_VIDEO'
      | 'STATIC_IMAGE'
      | 'CAROUSEL'
      | 'STORIES'
      | 'LIVE_STREAM'
      | 'BLOG_ARTICLE'
      | 'NEWSLETTER'
      | 'UGC_RAW_FOOTAGE'
      | undefined;
    brandCategory?: string | null | undefined;
    watchTimePercent?: number | null | undefined;
    isPaid?: boolean | undefined;
  }
>;
export type UpdatePerformanceLog = z.infer<typeof UpdatePerformanceLogSchema>;
export declare const PerformanceMetricsSchema: z.ZodObject<
  {
    views: z.ZodNumber;
    likes: z.ZodNumber;
    comments: z.ZodNumber;
    saves: z.ZodNumber;
    shares: z.ZodNumber;
    watchTimePercent: z.ZodNullable<z.ZodNumber>;
    engagementRate: z.ZodNumber;
    cpv: z.ZodNullable<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    comments: number;
    views: number;
    likes: number;
    shares: number;
    saves: number;
    engagementRate: number;
    watchTimePercent: number | null;
    cpv: number | null;
  },
  {
    comments: number;
    views: number;
    likes: number;
    shares: number;
    saves: number;
    engagementRate: number;
    watchTimePercent: number | null;
    cpv: number | null;
  }
>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export declare const RollingAverageSchema: z.ZodObject<
  {
    days: z.ZodUnion<[z.ZodLiteral<30>, z.ZodLiteral<60>, z.ZodLiteral<90>]>;
    avgViews: z.ZodNumber;
    avgEngagementRate: z.ZodNumber;
    avgCpv: z.ZodNullable<z.ZodNumber>;
    totalPosts: z.ZodNumber;
  },
  'strip',
  z.ZodTypeAny,
  {
    avgEngagementRate: number;
    avgViews: number;
    days: 60 | 30 | 90;
    avgCpv: number | null;
    totalPosts: number;
  },
  {
    avgEngagementRate: number;
    avgViews: number;
    days: 60 | 30 | 90;
    avgCpv: number | null;
    totalPosts: number;
  }
>;
export type RollingAverage = z.infer<typeof RollingAverageSchema>;
//# sourceMappingURL=performance-log.schema.d.ts.map
