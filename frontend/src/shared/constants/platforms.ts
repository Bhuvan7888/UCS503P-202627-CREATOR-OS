import type { components } from "@/shared/lib/api-types";

export type Platform = components["schemas"]["ContentItem"]["target_platforms"][number];

/** The platforms Creator OS knows (planning tags and hand-entered analytics; it does not post to them). */
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
