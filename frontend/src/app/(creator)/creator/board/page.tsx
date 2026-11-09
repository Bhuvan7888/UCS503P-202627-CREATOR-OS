"use client";

import React, { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import client from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import type { components } from "@/lib/api-types";

type Deal = components["schemas"]["Deal"];
type WeeklyValuePoint = components["schemas"]["WeeklyValuePoint"];

const STAGES: { key: string; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "negotiating", label: "Negotiating" },
  { key: "contracted", label: "Contracted" },
  { key: "in_production", label: "In production" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function CreatorBoardPage() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [weekly, setWeekly] = useState<WeeklyValuePoint[]>([]);
  const [error, setError] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  function reload() {
    client.GET("/deals", { params: { query: { limit: 100 } } }).then(({ data, error: apiError }) => {
      if (apiError) { setError(true); return; }
      setDeals(data ?? []);
    });
    client.GET("/deals/weekly-value", { params: { query: { weeks: 8 } } })
      .then(({ data }) => setWeekly(data ?? []));
  }

  useEffect(() => { reload(); }, []);

  async function moveDeal(dealId: string, status: string) {
    setDeals((prev) => prev?.map((d) => (d.id === dealId ? { ...d, status } : d)) ?? prev);
    await client.PATCH("/deals/{id}/status", {
      params: { path: { id: dealId } },
      body: { status: status as "lead" | "negotiating" | "contracted" | "in_production" | "completed" | "cancelled" },
    });
    reload();
  }

  function onDrop(e: React.DragEvent, stage: string) {
    e.preventDefault();
    setOverStage(null);
    if (dragId) moveDeal(dragId, stage);
    setDragId(null);
  }

  if (error) {
    return <EmptyState icon={LayoutGrid} message="Couldn't load your board. Try signing in again." />;
  }
  if (deals === null) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }

  const maxWeekly = Math.max(...weekly.map((w) => w.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "10px" }}>Weekly accomplished value</div>
        {weekly.every((w) => w.value === 0) ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>
            No completed deals yet — value shows up here once a deal moves to Completed.
          </div>
        ) : (
          <svg viewBox="0 0 560 140" role="img" aria-label="Weekly value of deals moved to Completed, most recent 8 weeks"
            style={{ width: "100%", maxWidth: "560px", height: "140px" }}>
            {weekly.map((w, i) => {
              const barW = 560 / weekly.length - 10;
              const x = i * (560 / weekly.length) + 5;
              const h = (w.value / maxWeekly) * 96;
              const y = 110 - h;
              return (
                <g key={w.week_start}>
                  <rect x={x} y={y} width={barW} height={h} rx="3" fill="var(--color-accent)" opacity={w.value > 0 ? 1 : 0.15} />
                  <text x={x + barW / 2} y={126} textAnchor="middle" fontSize="9" fill="var(--color-ink-faint)">
                    {new Date(w.week_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </text>
                  {w.value > 0 && (
                    <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="var(--color-ink-soft)">
                      {money(w.value)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {deals.length === 0 ? (
        <EmptyState icon={LayoutGrid} message="No deals yet. Add one from your Negotiation page." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: "10px" }}>
          {STAGES.map((stage) => (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage.key); }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => onDrop(e, stage.key)}
              className="mtile"
              style={{
                minHeight: "220px",
                background: overStage === stage.key ? "var(--color-accent-soft)" : undefined,
                display: "flex", flexDirection: "column", gap: "8px",
              }}
            >
              <div className="lbl">{stage.label} · {deals.filter((d) => d.status === stage.key).length}</div>
              {deals.filter((d) => d.status === stage.key).map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={() => setDragId(d.id)}
                  onDragEnd={() => setDragId(null)}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    fontSize: "12px",
                    cursor: "grab",
                    opacity: dragId === d.id ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{d.campaign_name}</div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "11px", marginTop: "2px" }}>{d.contact_email}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
