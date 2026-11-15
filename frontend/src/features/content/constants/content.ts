import type { components } from "@/shared/lib/api-types";

export type ContentItem = components["schemas"]["ContentItem"];
export type ContentStats = components["schemas"]["ContentStats"];
export type ContentType = ContentItem["type"];
export type ContentStage = ContentItem["stage"];
export type { Platform } from "@/shared/constants/platforms";

export const CONTENT_TYPES: { value: ContentType; label: string; platforms: number }[] = [
  { value: "long_form_video", label: "Long-form Video", platforms: 4 },
  { value: "post", label: "Post", platforms: 3 },
  { value: "reel", label: "Reel", platforms: 2 },
  { value: "story", label: "Story", platforms: 3 },
  { value: "short_form_video", label: "Short-form Video", platforms: 2 },
];

export const CONTENT_TYPE_LABEL = Object.fromEntries(
  CONTENT_TYPES.map((t) => [t.value, t.label]),
) as Record<ContentType, string>;

export const STAGES: { value: ContentStage; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "scripted", label: "Scripted" },
  { value: "in_production", label: "In production" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.value, s.label])) as Record<
  ContentStage,
  string
>;

// shared with platform analytics (platform-stats)
export { PLATFORMS, PLATFORM_LABEL } from "@/shared/constants/platforms";
