import React from "react";
import type { components } from "@/shared/lib/api-types";

type BrandAnalytics = components["schemas"]["BrandAnalytics"];

export function RevenueChart({ data }: { data: BrandAnalytics["revenue_by_month"] }) {
  if (data.length === 0) {
    return <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No payments yet.</div>;
  }
  const max = Math.max(...data.map((d) => d.paid + d.pending), 1);
  return (
    <div>
      <svg width="100%" height="120" viewBox={`0 0 ${data.length * 40} 120`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const paidH = (d.paid / max) * 100;
          const pendingH = (d.pending / max) * 100;
          const x = i * 40 + 6;
          return (
            <g key={d.month}>
              <rect x={x} y={100 - paidH} width={16} height={paidH} fill="var(--color-success)" />
              <rect x={x} y={100 - paidH - pendingH} width={16} height={pendingH} fill="var(--color-warning)" />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--color-ink-faint)" }}>
        {data.map((d) => <span key={d.month}>{d.month.slice(5)}</span>)}
      </div>
      <div style={{ display: "flex", gap: "14px", fontSize: "11px", marginTop: "6px" }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-success)", borderRadius: 2, marginRight: 4 }} />Paid</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-warning)", borderRadius: 2, marginRight: 4 }} />Pending</span>
      </div>
    </div>
  );
}
