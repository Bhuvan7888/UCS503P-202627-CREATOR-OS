"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { StatusPill, StatusVariant } from "@/components/StatusPill";
import type { components } from "@/lib/api-types";

type Deal = components["schemas"]["Deal"];

const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  negotiating: "Negotiating",
  contracted: "Contracted",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};

function dealVariant(status: string): StatusVariant {
  switch (status) {
    case "negotiating": return "warning";
    case "contracted": return "success";
    case "completed": return "success";
    case "cancelled": return "danger";
    default: return "neutral";
  }
}

// Every row is clickable — it's the entry point into that deal's dedicated
// negotiation workspace (rate calculator + forecast + AI chat).
export function DealsTable({ deals }: { deals: Deal[] }) {
  const router = useRouter();

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
      <tbody>
        {deals.map((d) => (
          <tr
            key={d.id}
            onClick={() => router.push(`/creator/negotiate/${d.id}`)}
            style={{ cursor: "pointer" }}
            className="deal-row"
          >
            <td style={{ padding: "10px 4px", borderBottom: "1px solid var(--color-border)" }}>{d.campaign_name}</td>
            <td style={{ padding: "10px 4px", borderBottom: "1px solid var(--color-border)" }}>
              <StatusPill status={DEAL_STAGE_LABEL[d.status] ?? d.status} variant={dealVariant(d.status)} />
            </td>
            <td style={{ padding: "10px 4px", borderBottom: "1px solid var(--color-border)", color: "var(--color-accent)", textAlign: "right" }}>
              Negotiate →
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
