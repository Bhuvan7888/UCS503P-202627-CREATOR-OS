import type { components } from "@/shared/lib/api-types";

type ClauseCardOut = components["schemas"]["ClauseCardOut"];

export interface Highlight {
  start: number;
  end: number;
  flag: "red" | "yellow";
  reason: string | null;
}

export function findHighlights(fullText: string, clauses: ClauseCardOut[]): Highlight[] {
  const ranges: Highlight[] = [];
  for (const c of clauses) {
    if (c.flag === "green") continue;
    const trimmed = c.raw_text.trim();
    if (!trimmed) continue;
    const pattern = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    try {
      const match = fullText.match(new RegExp(pattern));
      if (match && match.index !== undefined) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          flag: c.flag,
          reason: c.flag_reason_code ?? null,
        });
      }
    } catch {
      // Ignore regex issues
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  for (const r of ranges) {
    if (merged.length && r.start < merged[merged.length - 1].end) continue;
    merged.push(r);
  }
  return merged;
}
