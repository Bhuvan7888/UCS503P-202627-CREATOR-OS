export type UserRole = 'CREATOR' | 'ADMIN' | 'BRAND';
export type SocialPlatform =
  | 'INSTAGRAM'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'TWITCH'
  | 'PINTEREST'
  | 'PODCAST';
export type PostingFrequency =
  | 'DAILY'
  | 'MULTIPLE_WEEKLY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'LESS_THAN_MONTHLY';
export type ContentFormat =
  | 'SHORT_FORM_VIDEO'
  | 'LONG_FORM_VIDEO'
  | 'STATIC_IMAGE'
  | 'CAROUSEL'
  | 'STORIES'
  | 'LIVE_STREAM'
  | 'PODCAST'
  | 'BLOG_ARTICLE'
  | 'NEWSLETTER'
  | 'UGC_RAW_FOOTAGE';
export type AudienceAgeRange =
  | 'AGE_13_17'
  | 'AGE_18_24'
  | 'AGE_25_34'
  | 'AGE_35_44'
  | 'AGE_45_54'
  | 'AGE_55_PLUS';
export interface PlatformHandle {
  platform: SocialPlatform;
  handle: string;
  url?: string;
  followerCount: number;
  verified: boolean;
}
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  provider?: string | null;
  createdAt: Date;
  updatedAt: Date;
  profile?: CreatorProfile | null;
}
export interface CreatorProfile {
  id: string;
  userId: string;
  bio?: string | null;
  niche: string[];
  location?: string | null;
  website?: string | null;
  platformHandles: PlatformHandle[];
  primaryPlatform?: SocialPlatform | null;
  avgEngagementRate?: number | null;
  avgViews?: number | null;
  totalFollowers: number;
  postingFrequency?: PostingFrequency | null;
  contentFormats: ContentFormat[];
  audienceGeography: string[];
  audienceAgeRange: AudienceAgeRange[];
  currency: string;
  baseRate?: number | null;
  isOnboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
//# sourceMappingURL=user.d.ts.map
