"use client";

import React from "react";

interface RateCalculatorFormProps {
  defaultViewsPerWeek?: number;
  busy: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

// The inputs that seed a new negotiation session's suggested rate range —
// deal is already known from the page it's rendered on, so no deal picker here.
export function RateCalculatorForm({ defaultViewsPerWeek, busy, onSubmit }: RateCalculatorFormProps) {
  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      <label className="text-label">Views/week
        <input name="views_per_week" type="number" required className="field" defaultValue={defaultViewsPerWeek ?? 10000} />
      </label>
      <label className="text-label">Niche CPM (₹)
        <input name="niche_cpm" type="number" step="0.01" required className="field" defaultValue={50} />
      </label>
      <label className="text-label">Follower tier multiplier (₹)
        <input name="follower_tier_multiplier" type="number" step="0.01" required className="field" defaultValue={0} />
      </label>
      <label className="text-label">Engagement adjustment (₹)
        <input name="engagement_rate_adjustment" type="number" step="0.01" required className="field" defaultValue={0} />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <button className="btn" disabled={busy} type="submit">Calculate my rate</button>
      </div>
    </form>
  );
}
