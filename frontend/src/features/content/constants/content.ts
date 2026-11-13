import type { components } from "@/shared/lib/api-types";

export type ContentItem = components["schemas"]["ContentItem"];
export type ContentStats = components["schemas"]["ContentStats"];
export type ContentType = ContentItem["type"];
export type ContentStage = ContentItem["stage"];
export type Platform = ContentItem["target_platforms"][number];

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

/** Planning tags: Creator OS does not post to these platforms. */
export const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "youtube", label: "YouTube", color: "#ff0000" },
  { value: "instagram", label: "Instagram", color: "#e4405f" },
  { value: "x", label: "X", color: "#15151a" },
  { value: "linkedin", label: "LinkedIn", color: "#0077b5" },
  { value: "facebook", label: "Facebook", color: "#1877f2" },
];

export const PLATFORM_LABEL = Object.fromEntries(
  PLATFORMS.map((p) => [p.value, p.label]),
) as Record<Platform, string>;
