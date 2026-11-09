import { z } from 'zod';

// ─── Enum Schemas ─────────────────────────────────────────────

export const SocialPlatformSchema = z.enum([
  'INSTAGRAM',
  'YOUTUBE',
  'TIKTOK',
  'TWITTER',
  'LINKEDIN',
  'TWITCH',
  'PINTEREST',
  'PODCAST',
]);

export const PostingFrequencySchema = z.enum([
  'DAILY',
  'MULTIPLE_WEEKLY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'LESS_THAN_MONTHLY',
]);

export const ContentFormatSchema = z.enum([
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

export const AudienceAgeRangeSchema = z.enum([
  'AGE_13_17',
  'AGE_18_24',
  'AGE_25_34',
  'AGE_35_44',
  'AGE_45_54',
  'AGE_55_PLUS',
]);

export const UserRoleSchema = z.enum(['CREATOR', 'ADMIN', 'BRAND']);

// ─── Auth Schemas ─────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: UserRoleSchema.default('CREATOR'),
  igUsername: z.string().optional(),
  igFollowersCount: z.coerce.number().int().nonnegative().optional(),
  brandDescription: z.string().optional(),
  brandNiche: z.array(z.string()).optional(),
  brandWebsite: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Platform Handle Schema ───────────────────────────────────

export const PlatformHandleSchema = z.object({
  platform: SocialPlatformSchema,
  handle: z
    .string()
    .min(1)
    .max(100)
    .regex(/^@?[\w.]+$/, 'Invalid handle format')
    .transform((h) => (h.startsWith('@') ? h : `@${h}`)),
  url: z.string().url().optional(),
  followerCount: z.number().int().nonnegative(),
  verified: z.boolean().default(false),
});

// ─── User Schemas ─────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: UserRoleSchema.default('CREATOR'),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8).max(128),
});

export const UpdateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// ─── Onboarding Step Schemas ──────────────────────────────────

/** Step 1: Platform & Identity */
export const OnboardingStep1Schema = z.object({
  primaryPlatform: SocialPlatformSchema,
  platformHandles: z.array(PlatformHandleSchema).min(1, 'Add at least one platform handle'),
  totalFollowers: z.number().int().nonnegative(),
  avgViews: z.number().int().nonnegative().optional(),
});

/** Step 2: Content & Niche */
export const OnboardingStep2Schema = z.object({
  niche: z.array(z.string().min(1)).min(1, 'Select at least one niche').max(5, 'Maximum 5 niches'),
  contentFormats: z.array(ContentFormatSchema).min(1, 'Select at least one content format'),
  postingFrequency: PostingFrequencySchema,
});

/** Step 3: Audience */
export const OnboardingStep3Schema = z.object({
  audienceGeography: z.array(z.string().min(2).max(2)).min(1, 'Add at least one country'),
  audienceAgeRange: z.array(AudienceAgeRangeSchema).min(1, 'Select at least one age range'),
  avgEngagementRate: z.number().min(0).max(100).optional().describe('Percentage (0–100)'),
});

/** Step 4: Rates & Bio */
export const OnboardingStep4Schema = z.object({
  baseRate: z.number().positive('Base rate must be positive').optional(),
  currency: z.string().length(3, 'Must be a 3-letter currency code').default('USD'),
  bio: z.string().max(2000).optional(),
  location: z.string().max(255).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

/** Full onboarding form (all steps merged) */
export const CreateCreatorProfileSchema = OnboardingStep1Schema.merge(OnboardingStep2Schema)
  .merge(OnboardingStep3Schema)
  .merge(OnboardingStep4Schema);

/** Partial update schema */
export const UpdateCreatorProfileSchema = CreateCreatorProfileSchema.partial();

// ─── Full Profile Schema (API response) ──────────────────────

export const CreatorProfileSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  bio: z.string().max(2000).nullable().optional(),
  niche: z.array(z.string()).default([]),
  location: z.string().max(255).nullable().optional(),
  website: z.string().url().nullable().optional(),
  platformHandles: z.array(PlatformHandleSchema).default([]),
  primaryPlatform: SocialPlatformSchema.nullable().optional(),
  avgEngagementRate: z.number().min(0).max(100).nullable().optional(),
  avgViews: z.number().int().nonnegative().nullable().optional(),
  totalFollowers: z.number().int().nonnegative().default(0),
  postingFrequency: PostingFrequencySchema.nullable().optional(),
  contentFormats: z.array(ContentFormatSchema).default([]),
  audienceGeography: z.array(z.string()).default([]),
  audienceAgeRange: z.array(AudienceAgeRangeSchema).default([]),
  currency: z.string().length(3).default('USD'),
  baseRate: z.number().positive().nullable().optional(),
  isOnboardingComplete: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ─── Type Exports ─────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type OnboardingStep1Input = z.infer<typeof OnboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof OnboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof OnboardingStep3Schema>;
export type OnboardingStep4Input = z.infer<typeof OnboardingStep4Schema>;
export type CreateCreatorProfileInput = z.infer<typeof CreateCreatorProfileSchema>;
export type UpdateCreatorProfileInput = z.infer<typeof UpdateCreatorProfileSchema>;
