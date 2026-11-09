import { z } from 'zod';
export declare const BrandTierEnum: z.ZodEnum<
  ['NANO', 'MICRO', 'MID', 'MACRO', 'MEGA', 'ENTERPRISE']
>;
export type BrandTier = z.infer<typeof BrandTierEnum>;
export declare const DealTypeEnum: z.ZodEnum<
  ['SPONSORED_POST', 'UGC', 'AMBASSADOR', 'AFFILIATE', 'PRODUCT_GIFTING', 'EVENT']
>;
export type DealType = z.infer<typeof DealTypeEnum>;
export declare const UsageRightEnum: z.ZodEnum<
  [
    'ORGANIC_ONLY',
    'PAID_ADS',
    'WHITELISTING',
    'EXCLUSIVITY',
    'IN_PERPETUITY',
    'GEO_RESTRICTED',
    'REPURPOSE_ALLOWED',
  ]
>;
export type UsageRight = z.infer<typeof UsageRightEnum>;
export declare const RateIntelligenceInputSchema: z.ZodObject<
  {
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
    usageRights: z.ZodArray<
      z.ZodEnum<
        [
          'ORGANIC_ONLY',
          'PAID_ADS',
          'WHITELISTING',
          'EXCLUSIVITY',
          'IN_PERPETUITY',
          'GEO_RESTRICTED',
          'REPURPOSE_ALLOWED',
        ]
      >,
      'many'
    >;
    exclusivityDays: z.ZodNumber;
    isRush: z.ZodDefault<z.ZodBoolean>;
    revisionRounds: z.ZodDefault<z.ZodNumber>;
    brandTier: z.ZodEnum<['NANO', 'MICRO', 'MID', 'MACRO', 'MEGA', 'ENTERPRISE']>;
    dealType: z.ZodEnum<
      ['SPONSORED_POST', 'UGC', 'AMBASSADOR', 'AFFILIATE', 'PRODUCT_GIFTING', 'EVENT']
    >;
    brandCategory: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    exclusivityDays: number;
    usageRights: (
      | 'ORGANIC_ONLY'
      | 'PAID_ADS'
      | 'WHITELISTING'
      | 'EXCLUSIVITY'
      | 'IN_PERPETUITY'
      | 'GEO_RESTRICTED'
      | 'REPURPOSE_ALLOWED'
    )[];
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
    isRush: boolean;
    revisionRounds: number;
    brandTier: 'NANO' | 'MICRO' | 'MID' | 'MACRO' | 'MEGA' | 'ENTERPRISE';
    dealType: 'SPONSORED_POST' | 'UGC' | 'AMBASSADOR' | 'AFFILIATE' | 'PRODUCT_GIFTING' | 'EVENT';
    brandCategory: string;
  },
  {
    exclusivityDays: number;
    usageRights: (
      | 'ORGANIC_ONLY'
      | 'PAID_ADS'
      | 'WHITELISTING'
      | 'EXCLUSIVITY'
      | 'IN_PERPETUITY'
      | 'GEO_RESTRICTED'
      | 'REPURPOSE_ALLOWED'
    )[];
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
    brandTier: 'NANO' | 'MICRO' | 'MID' | 'MACRO' | 'MEGA' | 'ENTERPRISE';
    dealType: 'SPONSORED_POST' | 'UGC' | 'AMBASSADOR' | 'AFFILIATE' | 'PRODUCT_GIFTING' | 'EVENT';
    brandCategory: string;
    isRush?: boolean | undefined;
    revisionRounds?: number | undefined;
  }
>;
export type RateIntelligenceInput = z.infer<typeof RateIntelligenceInputSchema>;
export declare const RateIntelligenceResultSchema: z.ZodObject<
  {
    recommendedMin: z.ZodNumber;
    recommendedMax: z.ZodNumber;
    rationale: z.ZodString;
    peerComparison: z.ZodObject<
      {
        label: z.ZodString;
        percentile: z.ZodNumber;
        insight: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        label: string;
        percentile: number;
        insight: string;
      },
      {
        label: string;
        percentile: number;
        insight: string;
      }
    >;
    brandComparison: z.ZodObject<
      {
        label: z.ZodString;
        averageRate: z.ZodNumber;
        insight: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        label: string;
        insight: string;
        averageRate: number;
      },
      {
        label: string;
        insight: string;
        averageRate: number;
      }
    >;
    counterofferEmail: z.ZodString;
    negotiationPoints: z.ZodArray<z.ZodString, 'many'>;
  },
  'strip',
  z.ZodTypeAny,
  {
    recommendedMin: number;
    recommendedMax: number;
    rationale: string;
    peerComparison: {
      label: string;
      percentile: number;
      insight: string;
    };
    brandComparison: {
      label: string;
      insight: string;
      averageRate: number;
    };
    counterofferEmail: string;
    negotiationPoints: string[];
  },
  {
    recommendedMin: number;
    recommendedMax: number;
    rationale: string;
    peerComparison: {
      label: string;
      percentile: number;
      insight: string;
    };
    brandComparison: {
      label: string;
      insight: string;
      averageRate: number;
    };
    counterofferEmail: string;
    negotiationPoints: string[];
  }
>;
export type RateIntelligenceResult = z.infer<typeof RateIntelligenceResultSchema>;
export declare const RateIntelligenceResponseSchema: z.ZodObject<
  {
    requestId: z.ZodString;
    input: z.ZodObject<
      {
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
        usageRights: z.ZodArray<
          z.ZodEnum<
            [
              'ORGANIC_ONLY',
              'PAID_ADS',
              'WHITELISTING',
              'EXCLUSIVITY',
              'IN_PERPETUITY',
              'GEO_RESTRICTED',
              'REPURPOSE_ALLOWED',
            ]
          >,
          'many'
        >;
        exclusivityDays: z.ZodNumber;
        isRush: z.ZodDefault<z.ZodBoolean>;
        revisionRounds: z.ZodDefault<z.ZodNumber>;
        brandTier: z.ZodEnum<['NANO', 'MICRO', 'MID', 'MACRO', 'MEGA', 'ENTERPRISE']>;
        dealType: z.ZodEnum<
          ['SPONSORED_POST', 'UGC', 'AMBASSADOR', 'AFFILIATE', 'PRODUCT_GIFTING', 'EVENT']
        >;
        brandCategory: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        exclusivityDays: number;
        usageRights: (
          | 'ORGANIC_ONLY'
          | 'PAID_ADS'
          | 'WHITELISTING'
          | 'EXCLUSIVITY'
          | 'IN_PERPETUITY'
          | 'GEO_RESTRICTED'
          | 'REPURPOSE_ALLOWED'
        )[];
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
        isRush: boolean;
        revisionRounds: number;
        brandTier: 'NANO' | 'MICRO' | 'MID' | 'MACRO' | 'MEGA' | 'ENTERPRISE';
        dealType:
          | 'SPONSORED_POST'
          | 'UGC'
          | 'AMBASSADOR'
          | 'AFFILIATE'
          | 'PRODUCT_GIFTING'
          | 'EVENT';
        brandCategory: string;
      },
      {
        exclusivityDays: number;
        usageRights: (
          | 'ORGANIC_ONLY'
          | 'PAID_ADS'
          | 'WHITELISTING'
          | 'EXCLUSIVITY'
          | 'IN_PERPETUITY'
          | 'GEO_RESTRICTED'
          | 'REPURPOSE_ALLOWED'
        )[];
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
        brandTier: 'NANO' | 'MICRO' | 'MID' | 'MACRO' | 'MEGA' | 'ENTERPRISE';
        dealType:
          | 'SPONSORED_POST'
          | 'UGC'
          | 'AMBASSADOR'
          | 'AFFILIATE'
          | 'PRODUCT_GIFTING'
          | 'EVENT';
        brandCategory: string;
        isRush?: boolean | undefined;
        revisionRounds?: number | undefined;
      }
    >;
    result: z.ZodObject<
      {
        recommendedMin: z.ZodNumber;
        recommendedMax: z.ZodNumber;
        rationale: z.ZodString;
        peerComparison: z.ZodObject<
          {
            label: z.ZodString;
            percentile: z.ZodNumber;
            insight: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            label: string;
            percentile: number;
            insight: string;
          },
          {
            label: string;
            percentile: number;
            insight: string;
          }
        >;
        brandComparison: z.ZodObject<
          {
            label: z.ZodString;
            averageRate: z.ZodNumber;
            insight: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            label: string;
            insight: string;
            averageRate: number;
          },
          {
            label: string;
            insight: string;
            averageRate: number;
          }
        >;
        counterofferEmail: z.ZodString;
        negotiationPoints: z.ZodArray<z.ZodString, 'many'>;
      },
      'strip',
      z.ZodTypeAny,
      {
        recommendedMin: number;
        recommendedMax: number;
        rationale: string;
        peerComparison: {
          label: string;
          percentile: number;
          insight: string;
        };
        brandComparison: {
          label: string;
          insight: string;
          averageRate: number;
        };
        counterofferEmail: string;
        negotiationPoints: string[];
      },
      {
        recommendedMin: number;
        recommendedMax: number;
        rationale: string;
        peerComparison: {
          label: string;
          percentile: number;
          insight: string;
        };
        brandComparison: {
          label: string;
          insight: string;
          averageRate: number;
        };
        counterofferEmail: string;
        negotiationPoints: string[];
      }
    >;
    currency: z.ZodString;
    createdAt: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    createdAt: string;
    result: {
      recommendedMin: number;
      recommendedMax: number;
      rationale: string;
      peerComparison: {
        label: string;
        percentile: number;
        insight: string;
      };
      brandComparison: {
        label: string;
        insight: string;
        averageRate: number;
      };
      counterofferEmail: string;
      negotiationPoints: string[];
    };
    currency: string;
    requestId: string;
    input: {
      exclusivityDays: number;
      usageRights: (
        | 'ORGANIC_ONLY'
        | 'PAID_ADS'
        | 'WHITELISTING'
        | 'EXCLUSIVITY'
        | 'IN_PERPETUITY'
        | 'GEO_RESTRICTED'
        | 'REPURPOSE_ALLOWED'
      )[];
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
      isRush: boolean;
      revisionRounds: number;
      brandTier: 'NANO' | 'MICRO' | 'MID' | 'MACRO' | 'MEGA' | 'ENTERPRISE';
      dealType: 'SPONSORED_POST' | 'UGC' | 'AMBASSADOR' | 'AFFILIATE' | 'PRODUCT_GIFTING' | 'EVENT';
      brandCategory: string;
    };
  },
  {
    createdAt: string;
    result: {
      recommendedMin: number;
      recommendedMax: number;
      rationale: string;
      peerComparison: {
        label: string;
        percentile: number;
        insight: string;
      };
      brandComparison: {
        label: string;
        insight: string;
        averageRate: number;
      };
      counterofferEmail: string;
      negotiationPoints: string[];
    };
    currency: string;
    requestId: string;
    input: {
      exclusivityDays: number;
      usageRights: (
        | 'ORGANIC_ONLY'
        | 'PAID_ADS'
        | 'WHITELISTING'
        | 'EXCLUSIVITY'
        | 'IN_PERPETUITY'
        | 'GEO_RESTRICTED'
        | 'REPURPOSE_ALLOWED'
      )[];
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
      brandTier: 'NANO' | 'MICRO' | 'MID' | 'MACRO' | 'MEGA' | 'ENTERPRISE';
      dealType: 'SPONSORED_POST' | 'UGC' | 'AMBASSADOR' | 'AFFILIATE' | 'PRODUCT_GIFTING' | 'EVENT';
      brandCategory: string;
      isRush?: boolean | undefined;
      revisionRounds?: number | undefined;
    };
  }
>;
export type RateIntelligenceResponse = z.infer<typeof RateIntelligenceResponseSchema>;
//# sourceMappingURL=rate-intelligence.schema.d.ts.map
