'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CreatorProfileSchema =
  exports.UpdateCreatorProfileSchema =
  exports.CreateCreatorProfileSchema =
  exports.OnboardingStep4Schema =
  exports.OnboardingStep3Schema =
  exports.OnboardingStep2Schema =
  exports.OnboardingStep1Schema =
  exports.UpdateUserSchema =
  exports.CreateUserSchema =
  exports.UserSchema =
  exports.PlatformHandleSchema =
  exports.RefreshTokenSchema =
  exports.LoginSchema =
  exports.RegisterSchema =
  exports.UserRoleSchema =
  exports.AudienceAgeRangeSchema =
  exports.ContentFormatSchema =
  exports.PostingFrequencySchema =
  exports.SocialPlatformSchema =
    void 0;
const zod_1 = require('zod');
exports.SocialPlatformSchema = zod_1.z.enum([
  'INSTAGRAM',
  'YOUTUBE',
  'TIKTOK',
  'TWITTER',
  'LINKEDIN',
  'TWITCH',
  'PINTEREST',
  'PODCAST',
]);
exports.PostingFrequencySchema = zod_1.z.enum([
  'DAILY',
  'MULTIPLE_WEEKLY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'LESS_THAN_MONTHLY',
]);
exports.ContentFormatSchema = zod_1.z.enum([
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
]);
exports.AudienceAgeRangeSchema = zod_1.z.enum([
  'AGE_13_17',
  'AGE_18_24',
  'AGE_25_34',
  'AGE_35_44',
  'AGE_45_54',
  'AGE_55_PLUS',
]);
exports.UserRoleSchema = zod_1.z.enum(['CREATOR', 'ADMIN', 'BRAND']);
exports.RegisterSchema = zod_1.z.object({
  name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: zod_1.z.string().email('Invalid email address'),
  password: zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});
exports.LoginSchema = zod_1.z.object({
  email: zod_1.z.string().email('Invalid email address'),
  password: zod_1.z.string().min(1, 'Password is required'),
});
exports.RefreshTokenSchema = zod_1.z.object({
  refreshToken: zod_1.z.string().min(1),
});
exports.PlatformHandleSchema = zod_1.z.object({
  platform: exports.SocialPlatformSchema,
  handle: zod_1.z
    .string()
    .min(1)
    .max(100)
    .regex(/^@?[\w.]+$/, 'Invalid handle format')
    .transform((h) => (h.startsWith('@') ? h : `@${h}`)),
  url: zod_1.z.string().url().optional(),
  followerCount: zod_1.z.number().int().nonnegative(),
  verified: zod_1.z.boolean().default(false),
});
exports.UserSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  email: zod_1.z.string().email(),
  name: zod_1.z.string().min(1).max(255),
  role: exports.UserRoleSchema.default('CREATOR'),
  avatarUrl: zod_1.z.string().url().nullable().optional(),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.CreateUserSchema = exports.UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: zod_1.z.string().min(8).max(128),
});
exports.UpdateUserSchema = exports.UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
exports.OnboardingStep1Schema = zod_1.z.object({
  primaryPlatform: exports.SocialPlatformSchema,
  platformHandles: zod_1.z
    .array(exports.PlatformHandleSchema)
    .min(1, 'Add at least one platform handle'),
  totalFollowers: zod_1.z.number().int().nonnegative(),
  avgViews: zod_1.z.number().int().nonnegative().optional(),
});
exports.OnboardingStep2Schema = zod_1.z.object({
  niche: zod_1.z
    .array(zod_1.z.string().min(1))
    .min(1, 'Select at least one niche')
    .max(5, 'Maximum 5 niches'),
  contentFormats: zod_1.z
    .array(exports.ContentFormatSchema)
    .min(1, 'Select at least one content format'),
  postingFrequency: exports.PostingFrequencySchema,
});
exports.OnboardingStep3Schema = zod_1.z.object({
  audienceGeography: zod_1.z
    .array(zod_1.z.string().min(2).max(2))
    .min(1, 'Add at least one country'),
  audienceAgeRange: zod_1.z
    .array(exports.AudienceAgeRangeSchema)
    .min(1, 'Select at least one age range'),
  avgEngagementRate: zod_1.z.number().min(0).max(100).optional().describe('Percentage (0–100)'),
});
exports.OnboardingStep4Schema = zod_1.z.object({
  baseRate: zod_1.z.number().positive('Base rate must be positive').optional(),
  currency: zod_1.z.string().length(3, 'Must be a 3-letter currency code').default('USD'),
  bio: zod_1.z.string().max(2000).optional(),
  location: zod_1.z.string().max(255).optional(),
  website: zod_1.z.string().url('Invalid URL').optional().or(zod_1.z.literal('')),
});
exports.CreateCreatorProfileSchema = exports.OnboardingStep1Schema.merge(
  exports.OnboardingStep2Schema,
)
  .merge(exports.OnboardingStep3Schema)
  .merge(exports.OnboardingStep4Schema);
exports.UpdateCreatorProfileSchema = exports.CreateCreatorProfileSchema.partial();
exports.CreatorProfileSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  userId: zod_1.z.string().cuid(),
  bio: zod_1.z.string().max(2000).nullable().optional(),
  niche: zod_1.z.array(zod_1.z.string()).default([]),
  location: zod_1.z.string().max(255).nullable().optional(),
  website: zod_1.z.string().url().nullable().optional(),
  platformHandles: zod_1.z.array(exports.PlatformHandleSchema).default([]),
  primaryPlatform: exports.SocialPlatformSchema.nullable().optional(),
  avgEngagementRate: zod_1.z.number().min(0).max(100).nullable().optional(),
  avgViews: zod_1.z.number().int().nonnegative().nullable().optional(),
  totalFollowers: zod_1.z.number().int().nonnegative().default(0),
  postingFrequency: exports.PostingFrequencySchema.nullable().optional(),
  contentFormats: zod_1.z.array(exports.ContentFormatSchema).default([]),
  audienceGeography: zod_1.z.array(zod_1.z.string()).default([]),
  audienceAgeRange: zod_1.z.array(exports.AudienceAgeRangeSchema).default([]),
  currency: zod_1.z.string().length(3).default('USD'),
  baseRate: zod_1.z.number().positive().nullable().optional(),
  isOnboardingComplete: zod_1.z.boolean().default(false),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
//# sourceMappingURL=user.schema.js.map
