import { z } from 'zod';
export declare const SocialPlatformSchema: z.ZodEnum<
  ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
>;
export declare const PostingFrequencySchema: z.ZodEnum<
  ['DAILY', 'MULTIPLE_WEEKLY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'LESS_THAN_MONTHLY']
>;
export declare const ContentFormatSchema: z.ZodEnum<
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
export declare const AudienceAgeRangeSchema: z.ZodEnum<
  ['AGE_13_17', 'AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_PLUS']
>;
export declare const UserRoleSchema: z.ZodEnum<['CREATOR', 'ADMIN', 'BRAND']>;
export declare const RegisterSchema: z.ZodObject<
  {
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    email: string;
    password: string;
  },
  {
    name: string;
    email: string;
    password: string;
  }
>;
export declare const LoginSchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    email: string;
    password: string;
  },
  {
    email: string;
    password: string;
  }
>;
export declare const RefreshTokenSchema: z.ZodObject<
  {
    refreshToken: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    refreshToken: string;
  },
  {
    refreshToken: string;
  }
>;
export declare const PlatformHandleSchema: z.ZodObject<
  {
    platform: z.ZodEnum<
      ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
    >;
    handle: z.ZodEffects<z.ZodString, string, string>;
    url: z.ZodOptional<z.ZodString>;
    followerCount: z.ZodNumber;
    verified: z.ZodDefault<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    handle: string;
    platform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    followerCount: number;
    verified: boolean;
    url?: string | undefined;
  },
  {
    handle: string;
    platform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    followerCount: number;
    url?: string | undefined;
    verified?: boolean | undefined;
  }
>;
export declare const UserSchema: z.ZodObject<
  {
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<['CREATOR', 'ADMIN', 'BRAND']>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    name: string;
    email: string;
    role: 'CREATOR' | 'ADMIN' | 'BRAND';
    updatedAt: Date;
    avatarUrl?: string | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    name: string;
    email: string;
    updatedAt: Date;
    role?: 'CREATOR' | 'ADMIN' | 'BRAND' | undefined;
    avatarUrl?: string | null | undefined;
  }
>;
export declare const CreateUserSchema: z.ZodObject<
  Omit<
    {
      id: z.ZodString;
      email: z.ZodString;
      name: z.ZodString;
      role: z.ZodDefault<z.ZodEnum<['CREATOR', 'ADMIN', 'BRAND']>>;
      avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      createdAt: z.ZodDate;
      updatedAt: z.ZodDate;
    },
    'id' | 'createdAt' | 'updatedAt'
  > & {
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    email: string;
    role: 'CREATOR' | 'ADMIN' | 'BRAND';
    password: string;
    avatarUrl?: string | null | undefined;
  },
  {
    name: string;
    email: string;
    password: string;
    role?: 'CREATOR' | 'ADMIN' | 'BRAND' | undefined;
    avatarUrl?: string | null | undefined;
  }
>;
export declare const UpdateUserSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodDefault<z.ZodEnum<['CREATOR', 'ADMIN', 'BRAND']>>>;
    avatarUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string | undefined;
    email?: string | undefined;
    role?: 'CREATOR' | 'ADMIN' | 'BRAND' | undefined;
    avatarUrl?: string | null | undefined;
  },
  {
    name?: string | undefined;
    email?: string | undefined;
    role?: 'CREATOR' | 'ADMIN' | 'BRAND' | undefined;
    avatarUrl?: string | null | undefined;
  }
>;
export declare const OnboardingStep1Schema: z.ZodObject<
  {
    primaryPlatform: z.ZodEnum<
      ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
    >;
    platformHandles: z.ZodArray<
      z.ZodObject<
        {
          platform: z.ZodEnum<
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
          >;
          handle: z.ZodEffects<z.ZodString, string, string>;
          url: z.ZodOptional<z.ZodString>;
          followerCount: z.ZodNumber;
          verified: z.ZodDefault<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          verified: boolean;
          url?: string | undefined;
        },
        {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          url?: string | undefined;
          verified?: boolean | undefined;
        }
      >,
      'many'
    >;
    totalFollowers: z.ZodNumber;
    avgViews: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    platformHandles: {
      handle: string;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      followerCount: number;
      verified: boolean;
      url?: string | undefined;
    }[];
    primaryPlatform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    totalFollowers: number;
    avgViews?: number | undefined;
  },
  {
    platformHandles: {
      handle: string;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      followerCount: number;
      url?: string | undefined;
      verified?: boolean | undefined;
    }[];
    primaryPlatform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    totalFollowers: number;
    avgViews?: number | undefined;
  }
>;
export declare const OnboardingStep2Schema: z.ZodObject<
  {
    niche: z.ZodArray<z.ZodString, 'many'>;
    contentFormats: z.ZodArray<
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
      >,
      'many'
    >;
    postingFrequency: z.ZodEnum<
      ['DAILY', 'MULTIPLE_WEEKLY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'LESS_THAN_MONTHLY']
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    niche: string[];
    postingFrequency:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY';
    contentFormats: (
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
    )[];
  },
  {
    niche: string[];
    postingFrequency:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY';
    contentFormats: (
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
    )[];
  }
>;
export declare const OnboardingStep3Schema: z.ZodObject<
  {
    audienceGeography: z.ZodArray<z.ZodString, 'many'>;
    audienceAgeRange: z.ZodArray<
      z.ZodEnum<['AGE_13_17', 'AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_PLUS']>,
      'many'
    >;
    avgEngagementRate: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    audienceGeography: string[];
    audienceAgeRange: (
      | 'AGE_13_17'
      | 'AGE_18_24'
      | 'AGE_25_34'
      | 'AGE_35_44'
      | 'AGE_45_54'
      | 'AGE_55_PLUS'
    )[];
    avgEngagementRate?: number | undefined;
  },
  {
    audienceGeography: string[];
    audienceAgeRange: (
      | 'AGE_13_17'
      | 'AGE_18_24'
      | 'AGE_25_34'
      | 'AGE_35_44'
      | 'AGE_45_54'
      | 'AGE_55_PLUS'
    )[];
    avgEngagementRate?: number | undefined;
  }
>;
export declare const OnboardingStep4Schema: z.ZodObject<
  {
    baseRate: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]>;
  },
  'strip',
  z.ZodTypeAny,
  {
    currency: string;
    bio?: string | undefined;
    location?: string | undefined;
    website?: string | undefined;
    baseRate?: number | undefined;
  },
  {
    bio?: string | undefined;
    location?: string | undefined;
    website?: string | undefined;
    currency?: string | undefined;
    baseRate?: number | undefined;
  }
>;
export declare const CreateCreatorProfileSchema: z.ZodObject<
  {
    primaryPlatform: z.ZodEnum<
      ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
    >;
    platformHandles: z.ZodArray<
      z.ZodObject<
        {
          platform: z.ZodEnum<
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
          >;
          handle: z.ZodEffects<z.ZodString, string, string>;
          url: z.ZodOptional<z.ZodString>;
          followerCount: z.ZodNumber;
          verified: z.ZodDefault<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          verified: boolean;
          url?: string | undefined;
        },
        {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          url?: string | undefined;
          verified?: boolean | undefined;
        }
      >,
      'many'
    >;
    totalFollowers: z.ZodNumber;
    avgViews: z.ZodOptional<z.ZodNumber>;
  } & {
    niche: z.ZodArray<z.ZodString, 'many'>;
    contentFormats: z.ZodArray<
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
      >,
      'many'
    >;
    postingFrequency: z.ZodEnum<
      ['DAILY', 'MULTIPLE_WEEKLY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'LESS_THAN_MONTHLY']
    >;
  } & {
    audienceGeography: z.ZodArray<z.ZodString, 'many'>;
    audienceAgeRange: z.ZodArray<
      z.ZodEnum<['AGE_13_17', 'AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_PLUS']>,
      'many'
    >;
    avgEngagementRate: z.ZodOptional<z.ZodNumber>;
  } & {
    baseRate: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]>;
  },
  'strip',
  z.ZodTypeAny,
  {
    niche: string[];
    platformHandles: {
      handle: string;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      followerCount: number;
      verified: boolean;
      url?: string | undefined;
    }[];
    primaryPlatform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    totalFollowers: number;
    postingFrequency:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY';
    contentFormats: (
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
    )[];
    audienceGeography: string[];
    audienceAgeRange: (
      | 'AGE_13_17'
      | 'AGE_18_24'
      | 'AGE_25_34'
      | 'AGE_35_44'
      | 'AGE_45_54'
      | 'AGE_55_PLUS'
    )[];
    currency: string;
    bio?: string | undefined;
    location?: string | undefined;
    website?: string | undefined;
    avgEngagementRate?: number | undefined;
    avgViews?: number | undefined;
    baseRate?: number | undefined;
  },
  {
    niche: string[];
    platformHandles: {
      handle: string;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      followerCount: number;
      url?: string | undefined;
      verified?: boolean | undefined;
    }[];
    primaryPlatform:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST';
    totalFollowers: number;
    postingFrequency:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY';
    contentFormats: (
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
    )[];
    audienceGeography: string[];
    audienceAgeRange: (
      | 'AGE_13_17'
      | 'AGE_18_24'
      | 'AGE_25_34'
      | 'AGE_35_44'
      | 'AGE_45_54'
      | 'AGE_55_PLUS'
    )[];
    bio?: string | undefined;
    location?: string | undefined;
    website?: string | undefined;
    avgEngagementRate?: number | undefined;
    avgViews?: number | undefined;
    currency?: string | undefined;
    baseRate?: number | undefined;
  }
>;
export declare const UpdateCreatorProfileSchema: z.ZodObject<
  {
    primaryPlatform: z.ZodOptional<
      z.ZodEnum<
        ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'TWITCH', 'PINTEREST', 'PODCAST']
      >
    >;
    platformHandles: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            platform: z.ZodEnum<
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
            >;
            handle: z.ZodEffects<z.ZodString, string, string>;
            url: z.ZodOptional<z.ZodString>;
            followerCount: z.ZodNumber;
            verified: z.ZodDefault<z.ZodBoolean>;
          },
          'strip',
          z.ZodTypeAny,
          {
            handle: string;
            platform:
              | 'INSTAGRAM'
              | 'YOUTUBE'
              | 'TIKTOK'
              | 'TWITTER'
              | 'LINKEDIN'
              | 'TWITCH'
              | 'PINTEREST'
              | 'PODCAST';
            followerCount: number;
            verified: boolean;
            url?: string | undefined;
          },
          {
            handle: string;
            platform:
              | 'INSTAGRAM'
              | 'YOUTUBE'
              | 'TIKTOK'
              | 'TWITTER'
              | 'LINKEDIN'
              | 'TWITCH'
              | 'PINTEREST'
              | 'PODCAST';
            followerCount: number;
            url?: string | undefined;
            verified?: boolean | undefined;
          }
        >,
        'many'
      >
    >;
    totalFollowers: z.ZodOptional<z.ZodNumber>;
    avgViews: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    niche: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    contentFormats: z.ZodOptional<
      z.ZodArray<
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
        >,
        'many'
      >
    >;
    postingFrequency: z.ZodOptional<
      z.ZodEnum<['DAILY', 'MULTIPLE_WEEKLY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'LESS_THAN_MONTHLY']>
    >;
    audienceGeography: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    audienceAgeRange: z.ZodOptional<
      z.ZodArray<
        z.ZodEnum<['AGE_13_17', 'AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_PLUS']>,
        'many'
      >
    >;
    avgEngagementRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    baseRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    website: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    bio?: string | undefined;
    niche?: string[] | undefined;
    location?: string | undefined;
    website?: string | undefined;
    platformHandles?:
      | {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          verified: boolean;
          url?: string | undefined;
        }[]
      | undefined;
    primaryPlatform?:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST'
      | undefined;
    avgEngagementRate?: number | undefined;
    avgViews?: number | undefined;
    totalFollowers?: number | undefined;
    postingFrequency?:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY'
      | undefined;
    contentFormats?:
      | (
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
        )[]
      | undefined;
    audienceGeography?: string[] | undefined;
    audienceAgeRange?:
      | ('AGE_13_17' | 'AGE_18_24' | 'AGE_25_34' | 'AGE_35_44' | 'AGE_45_54' | 'AGE_55_PLUS')[]
      | undefined;
    currency?: string | undefined;
    baseRate?: number | undefined;
  },
  {
    bio?: string | undefined;
    niche?: string[] | undefined;
    location?: string | undefined;
    website?: string | undefined;
    platformHandles?:
      | {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          url?: string | undefined;
          verified?: boolean | undefined;
        }[]
      | undefined;
    primaryPlatform?:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST'
      | undefined;
    avgEngagementRate?: number | undefined;
    avgViews?: number | undefined;
    totalFollowers?: number | undefined;
    postingFrequency?:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY'
      | undefined;
    contentFormats?:
      | (
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
        )[]
      | undefined;
    audienceGeography?: string[] | undefined;
    audienceAgeRange?:
      | ('AGE_13_17' | 'AGE_18_24' | 'AGE_25_34' | 'AGE_35_44' | 'AGE_45_54' | 'AGE_55_PLUS')[]
      | undefined;
    currency?: string | undefined;
    baseRate?: number | undefined;
  }
>;
export declare const CreatorProfileSchema: z.ZodObject<
  {
    id: z.ZodString;
    userId: z.ZodString;
    bio: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    niche: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    website: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    platformHandles: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            platform: z.ZodEnum<
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
            >;
            handle: z.ZodEffects<z.ZodString, string, string>;
            url: z.ZodOptional<z.ZodString>;
            followerCount: z.ZodNumber;
            verified: z.ZodDefault<z.ZodBoolean>;
          },
          'strip',
          z.ZodTypeAny,
          {
            handle: string;
            platform:
              | 'INSTAGRAM'
              | 'YOUTUBE'
              | 'TIKTOK'
              | 'TWITTER'
              | 'LINKEDIN'
              | 'TWITCH'
              | 'PINTEREST'
              | 'PODCAST';
            followerCount: number;
            verified: boolean;
            url?: string | undefined;
          },
          {
            handle: string;
            platform:
              | 'INSTAGRAM'
              | 'YOUTUBE'
              | 'TIKTOK'
              | 'TWITTER'
              | 'LINKEDIN'
              | 'TWITCH'
              | 'PINTEREST'
              | 'PODCAST';
            followerCount: number;
            url?: string | undefined;
            verified?: boolean | undefined;
          }
        >,
        'many'
      >
    >;
    primaryPlatform: z.ZodOptional<
      z.ZodNullable<
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
      >
    >;
    avgEngagementRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    avgViews: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalFollowers: z.ZodDefault<z.ZodNumber>;
    postingFrequency: z.ZodOptional<
      z.ZodNullable<
        z.ZodEnum<
          ['DAILY', 'MULTIPLE_WEEKLY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'LESS_THAN_MONTHLY']
        >
      >
    >;
    contentFormats: z.ZodDefault<
      z.ZodArray<
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
        >,
        'many'
      >
    >;
    audienceGeography: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    audienceAgeRange: z.ZodDefault<
      z.ZodArray<
        z.ZodEnum<['AGE_13_17', 'AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_PLUS']>,
        'many'
      >
    >;
    currency: z.ZodDefault<z.ZodString>;
    baseRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isOnboardingComplete: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    userId: string;
    updatedAt: Date;
    niche: string[];
    platformHandles: {
      handle: string;
      platform:
        | 'INSTAGRAM'
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'TWITTER'
        | 'LINKEDIN'
        | 'TWITCH'
        | 'PINTEREST'
        | 'PODCAST';
      followerCount: number;
      verified: boolean;
      url?: string | undefined;
    }[];
    totalFollowers: number;
    contentFormats: (
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
    )[];
    audienceGeography: string[];
    audienceAgeRange: (
      | 'AGE_13_17'
      | 'AGE_18_24'
      | 'AGE_25_34'
      | 'AGE_35_44'
      | 'AGE_45_54'
      | 'AGE_55_PLUS'
    )[];
    currency: string;
    isOnboardingComplete: boolean;
    bio?: string | null | undefined;
    location?: string | null | undefined;
    website?: string | null | undefined;
    primaryPlatform?:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST'
      | null
      | undefined;
    avgEngagementRate?: number | null | undefined;
    avgViews?: number | null | undefined;
    postingFrequency?:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY'
      | null
      | undefined;
    baseRate?: number | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    userId: string;
    updatedAt: Date;
    bio?: string | null | undefined;
    niche?: string[] | undefined;
    location?: string | null | undefined;
    website?: string | null | undefined;
    platformHandles?:
      | {
          handle: string;
          platform:
            | 'INSTAGRAM'
            | 'YOUTUBE'
            | 'TIKTOK'
            | 'TWITTER'
            | 'LINKEDIN'
            | 'TWITCH'
            | 'PINTEREST'
            | 'PODCAST';
          followerCount: number;
          url?: string | undefined;
          verified?: boolean | undefined;
        }[]
      | undefined;
    primaryPlatform?:
      | 'INSTAGRAM'
      | 'YOUTUBE'
      | 'TIKTOK'
      | 'TWITTER'
      | 'LINKEDIN'
      | 'TWITCH'
      | 'PINTEREST'
      | 'PODCAST'
      | null
      | undefined;
    avgEngagementRate?: number | null | undefined;
    avgViews?: number | null | undefined;
    totalFollowers?: number | undefined;
    postingFrequency?:
      | 'DAILY'
      | 'MULTIPLE_WEEKLY'
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'LESS_THAN_MONTHLY'
      | null
      | undefined;
    contentFormats?:
      | (
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
        )[]
      | undefined;
    audienceGeography?: string[] | undefined;
    audienceAgeRange?:
      | ('AGE_13_17' | 'AGE_18_24' | 'AGE_25_34' | 'AGE_35_44' | 'AGE_45_54' | 'AGE_55_PLUS')[]
      | undefined;
    currency?: string | undefined;
    baseRate?: number | null | undefined;
    isOnboardingComplete?: boolean | undefined;
  }
>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type OnboardingStep1Input = z.infer<typeof OnboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof OnboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof OnboardingStep3Schema>;
export type OnboardingStep4Input = z.infer<typeof OnboardingStep4Schema>;
export type CreateCreatorProfileInput = z.infer<typeof CreateCreatorProfileSchema>;
export type UpdateCreatorProfileInput = z.infer<typeof UpdateCreatorProfileSchema>;
//# sourceMappingURL=user.schema.d.ts.map
