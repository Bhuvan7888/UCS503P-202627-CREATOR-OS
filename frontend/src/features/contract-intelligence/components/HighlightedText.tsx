import React from "react";
import type { components } from "@/shared/lib/api-types";
import { findHighlights } from "../utils/find-highlights.utils";

type ClauseCardOut = components["schemas"]["ClauseCardOut"];

export function HighlightedText({
  fullText,
  clauses,
}: {
  fullText: string;
  clauses: ClauseCardOut[];
}) {
  const highlights = findHighlights(fullText, clauses);
  if (highlights.length === 0) {
    return <>{fullText}</>;
  }
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  highlights.forEach((h, i) => {
    if (h.start > cursor) nodes.push(<span key={`t${i}`}>{fullText.slice(cursor, h.start)}</span>);
    nodes.push(
      <mark
        key={`h${i}`}
        title={h.reason ?? undefined}
        style={{
          background: h.flag === "red" ? "var(--color-danger-soft)" : "var(--color-warning-soft)",
          color: h.flag === "red" ? "var(--color-danger)" : "var(--color-warning)",
          padding: "1px 3px",
          borderRadius: "3px",
          fontWeight: 500,
        }}
      >
        {fullText.slice(h.start, h.end)}
      </mark>,
    );
    cursor = h.end;
  });
  if (cursor < fullText.length) nodes.push(<span key="tail">{fullText.slice(cursor)}</span>);
  return <>{nodes}</>;
}
