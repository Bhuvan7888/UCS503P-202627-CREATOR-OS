"use client";

import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import client from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import type { components } from "@/lib/api-types";

type BrandAnalytics = components["schemas"]["BrandAnalytics"];

const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  negotiating: "Negotiating",
  contracted: "Contracted",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: "8px", alignItems: "center", fontSize: "12px" }}>
      <div style={{ color: "var(--color-ink-soft)" }}>{label}</div>
      <div style={{ background: "var(--color-surface-sunken)", borderRadius: "4px", height: "10px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px" }} />
      </div>
      <div style={{ fontWeight: 600, minWidth: "70px", textAlign: "right" }}>{value}</div>
    </div>
  );
}

function RevenueChart({ data }: { data: BrandAnalytics["revenue_by_month"] }) {
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

export default function AnalyticsPage() {
  const [data, setData] = useState<BrandAnalytics | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    client.GET("/analytics/brand").then(({ data, error: apiError }) => {
      if (apiError) { setError(true); return; }
      setData(data ?? null);
    });
  }, []);

  if (error) {
    return <EmptyState icon={BarChart3} message="Couldn't load analytics. Try signing in again." />;
  }
  if (data === undefined) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }
  if (!data) {
    return <EmptyState icon={BarChart3} message="No analytics yet." />;
  }

  const maxStage = Math.max(...Object.values(data.deals_by_status), 1);
  const maxBrandValue = Math.max(...data.top_brands.map((b) => b.total_value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <div className="mtile"><div className="lbl">Creators</div><div className="val">{data.total_creators}</div></div>
        <div className="mtile"><div className="lbl">Deals</div><div className="val">{data.total_deals}</div></div>
        <div className="mtile">
          <div className="lbl">Overdue payments</div>
          <div className="val" style={{ color: data.overdue_payments_count > 0 ? "var(--color-danger)" : undefined }}>
            {data.overdue_payments_count}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "12px" }}>
        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "10px" }}>Revenue by month</div>
          <RevenueChart data={data.revenue_by_month} />
          {data.overdue_payments_count > 0 && (
            <div style={{ fontSize: "11.5px", color: "var(--color-danger)", marginTop: "8px" }}>
              {data.overdue_payments_count} overdue · {money(data.overdue_payments_total)} outstanding
            </div>
          )}
        </div>
        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "10px" }}>Deal pipeline</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(data.deals_by_status).map(([status, count]) => (
              <BarRow key={status} label={DEAL_STAGE_LABEL[status] ?? status} value={count} max={maxStage} color="var(--color-accent)" />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "10px" }}>Top campaigns</div>
          {data.top_brands.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No campaign revenue yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.top_brands.map((b) => (
                <div key={b.campaign_name} style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", gap: "8px", alignItems: "center", fontSize: "12px" }}>
                  <div>{b.campaign_name}</div>
                  <div style={{ background: "var(--color-surface-sunken)", borderRadius: "4px", height: "10px" }}>
                    <div style={{ width: `${Math.max((b.total_value / maxBrandValue) * 100, b.total_value > 0 ? 3 : 0)}%`, height: "100%", background: "var(--color-ink)", borderRadius: "4px" }} />
                  </div>
                  <div style={{ textAlign: "right", color: "var(--color-ink-soft)" }}>{money(b.total_value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "10px" }}>Creator performance</div>
          {data.creator_performance.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No creator revenue yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ color: "var(--color-ink-faint)", textAlign: "left" }}>
                  <th style={{ fontWeight: 600, padding: "4px" }}>Creator</th>
                  <th style={{ fontWeight: 600, padding: "4px" }}>Niche</th>
                  <th style={{ fontWeight: 600, padding: "4px" }}>Deals</th>
                  <th style={{ fontWeight: 600, padding: "4px" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {data.creator_performance.map((c) => (
                  <tr key={c.creator_id}>
                    <td style={{ padding: "4px" }}>{c.display_name}</td>
                    <td style={{ padding: "4px", color: "var(--color-ink-soft)" }}>{c.niche} · {c.follower_tier}</td>
                    <td style={{ padding: "4px" }}>{c.deal_count}</td>
                    <td style={{ padding: "4px" }}>{money(c.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "10px" }}>Roster by niche</div>
          {data.roster_by_niche.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No creators yet.</div>
          ) : (
            <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.roster_by_niche.map((n) => (
                <div key={`${n.niche}-${n.follower_tier}`}>
                  {n.niche} · {n.follower_tier}: <strong>{n.creator_count}</strong>
                  {n.avg_engagement_rate != null && <span style={{ color: "var(--color-ink-soft)" }}> ({n.avg_engagement_rate.toFixed(1)}% avg engagement)</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
