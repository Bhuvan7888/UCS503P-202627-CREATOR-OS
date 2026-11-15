import type { Creator } from "@/shared/lib/brand-queries";

const DAY_MS = 86_400_000;
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "today", "3 weeks ago", "4 months ago" … for an ISO date. */
export function age(iso: string, now: number = Date.now()): string {
  const days = Math.max(0, Math.round((now - new Date(iso).getTime()) / DAY_MS));
  if (days < 14) return relative.format(-days, "day");
  if (days < 60) return relative.format(-Math.round(days / 7), "week");
  if (days < 365) return relative.format(-Math.round(days / 30), "month");
  return relative.format(-Math.round(days / 365), "year");
}

/** Where a creator's numbers came from and how old they are — they are never verified. */
export function statsSource(c: Creator): string {
  if (c.followers_count == null) return "No numbers on file";
  const who = c.user_id ? "Self-reported" : "Added by you";
  return `${who} · ${age(c.stats_updated_at ?? c.created_at)}`;
}
