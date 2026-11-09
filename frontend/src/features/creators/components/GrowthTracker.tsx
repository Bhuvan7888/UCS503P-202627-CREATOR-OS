"use client";

import React from "react";
import type { components } from "@/lib/api-types";

type GrowthSnapshot = components["schemas"]["GrowthSnapshot"];

// Mirrors backend/domain/logic/growth.py::estimate_weekly_growth_rate — same
// compounding-rate fit across the oldest/newest logged snapshot, just for
// display here (the backend recomputes it server-side for the actual forecast).
export function computeGrowthRate(snapshots: GrowthSnapshot[]): number | null {
  if (snapshots.length < 2) return null;
  const ordered = [...snapshots].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const weeks = (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / (7 * 86400 * 1000);
  if (weeks <= 0 || first.followers_count <= 0) return null;
  return (last.followers_count / first.followers_count) ** (1 / weeks) - 1;
}

interface GrowthTrackerProps {
  snapshots: GrowthSnapshot[];
  onLog: (e: React.FormEvent<HTMLFormElement>) => void;
}

// Log a follower count against a date, and review the history — this feeds
// the growth rate every negotiation's forecast is built on.
export function GrowthTracker({ snapshots, onLog }: GrowthTrackerProps) {
  const computedRate = computeGrowthRate(snapshots);
  const sorted = [...snapshots].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

  return (
    <div className="mtile" style={{ marginBottom: "14px" }}>
      <div className="lbl" style={{ marginBottom: "8px" }}>Know your worth</div>
      <div style={{ fontSize: "12px", color: "var(--color-ink-soft)", marginBottom: "10px" }}>
        {snapshots.length === 0
          ? "Log your follower count over time to get a real growth rate instead of a guess — it drives every negotiation's forecast."
          : snapshots.length === 1
            ? "One snapshot logged — add a second to compute a growth rate."
            : <>Using {snapshots.length} recorded follower snapshots{computedRate !== null && <> — computed rate: <strong>{(computedRate * 100).toFixed(2)}%/week</strong></>}.</>}
      </div>

      <form onSubmit={onLog} style={{ display: "flex", gap: "6px", alignItems: "end", marginBottom: "10px" }}>
        <label className="text-label" style={{ margin: 0 }}>Date
          <input name="recorded_at" type="date" required className="field" style={{ margin: 0 }} />
        </label>
        <label className="text-label" style={{ margin: 0 }}>Followers
          <input name="followers_count" type="number" min={0} required className="field" style={{ margin: 0, maxWidth: "100px" }} />
        </label>
        <button className="btn" type="submit">Log</button>
      </form>

      {sorted.length > 0 && (
        <details>
          <summary style={{ fontSize: "12px", color: "var(--color-ink-soft)", cursor: "pointer" }}>
            Review logged snapshots ({sorted.length})
          </summary>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "8px" }}>
            <thead>
              <tr style={{ color: "var(--color-ink-faint)", textAlign: "left" }}>
                <th style={{ fontWeight: 600, padding: "4px" }}>Date</th>
                <th style={{ fontWeight: 600, padding: "4px" }}>Followers</th>
                <th style={{ fontWeight: 600, padding: "4px" }}>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: "4px", borderTop: "1px solid var(--color-border)" }}>{new Date(s.recorded_at).toLocaleDateString()}</td>
                  <td style={{ padding: "4px", borderTop: "1px solid var(--color-border)" }}>{s.followers_count.toLocaleString()}</td>
                  <td style={{ padding: "4px", borderTop: "1px solid var(--color-border)", color: "var(--color-ink-soft)" }}>
                    {s.engagement_rate != null ? `${s.engagement_rate}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
