"use client";

import React, { useRef, useState } from "react";
import type { components } from "@/lib/api-types";

type ForecastPoint = components["schemas"]["ForecastPoint"];

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function moneyCompact(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

// Standard "nice numbers" axis algorithm (same one d3/most charting libraries
// use): snaps min/max to round multiples of a tick step chosen from
// {1, 2, 5, 10} × 10^k, so the axis hugs the data instead of a crude
// round-to-nearest-magnitude ceiling that can waste half the chart's height.
function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

function niceAxis(min: number, max: number, tickCount: number): { min: number; max: number; step: number } {
  if (max <= min) max = min + 1;
  const range = niceNum(max - min, false);
  const step = niceNum(range / (tickCount - 1), true);
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}

const CHART_W = 720;
const CHART_H = 260;
const CHART_MARGIN = { top: 16, right: 20, bottom: 30, left: 66 };

interface ForecastChartProps {
  forecast: ForecastPoint[];
  /** Today's suggested range, drawn as a dashed reference band so the trend has something to compare against. */
  referenceLow?: number;
  referenceHigh?: number;
}

// A single-series band chart: shaded low–high range behind a 2px mid-estimate
// line, with axis gridlines, real calendar-date ticks, and pointer-driven
// crosshair+tooltip (works on touch, not just mouse — tap to pin, tap again
// to unpin). No charting library — this is the only chart in the app.
export function ForecastChart({ forecast, referenceLow, referenceHigh }: ForecastChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = forecast.length;
  const plotW = CHART_W - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotH = CHART_H - CHART_MARGIN.top - CHART_MARGIN.bottom;

  // Tight scale to the data's own range (plus the reference band, plus a
  // little padding) instead of always starting at 0 — a 0-based axis makes a
  // realistic ₹8L–13L band look like a flat sliver against a ₹20L ceiling.
  const values = forecast.flatMap((f) => [f.low, f.high]);
  if (referenceLow != null) values.push(referenceLow);
  if (referenceHigh != null) values.push(referenceHigh);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values, 1);
  const pad = (rawMax - rawMin) * 0.06 || rawMax * 0.06;
  const axis = niceAxis(Math.max(0, rawMin - pad), rawMax + pad, 5);
  const yMin = axis.min;
  const yMax = axis.max;

  const xAt = (i: number) => CHART_MARGIN.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const yAt = (v: number) => CHART_MARGIN.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const today = new Date();
  const dateAt = (i: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + forecast[i].week * 7);
    return d;
  };

  const bandPath =
    forecast.map((f, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(f.low)}`).join(" ") +
    " " +
    [...forecast].reverse().map((f, j) => `L ${xAt(n - 1 - j)} ${yAt(f.high)}`).join(" ") +
    " Z";
  const midPoints = forecast.map((f, i) => `${xAt(i)},${yAt(f.mid)}`).join(" ");

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + axis.step / 2; v += axis.step) yTicks.push(v);
  const xTickIdxs = n <= 6
    ? forecast.map((_, i) => i)
    : [0, Math.round((n - 1) * 0.25), Math.round((n - 1) * 0.5), Math.round((n - 1) * 0.75), n - 1];

  function indexFromClientX(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || n === 0) return null;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * CHART_W;
    const idx = Math.round(((svgX - CHART_MARGIN.left) / plotW) * (n - 1));
    return Math.min(Math.max(idx, 0), n - 1);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (pinned) return;
    const idx = indexFromClientX(e.clientX);
    if (idx !== null) setHoverIdx(idx);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const idx = indexFromClientX(e.clientX);
    if (idx === null) return;
    if (pinned && idx === hoverIdx) {
      setPinned(false);
    } else {
      setHoverIdx(idx);
      setPinned(true);
    }
  }

  const activeIdx = hoverIdx;
  const active = activeIdx !== null ? forecast[activeIdx] : null;
  const first = forecast[0];
  const last = forecast[n - 1];
  const tooltipW = 150, tooltipH = 66;
  const tipX = activeIdx !== null
    ? (xAt(activeIdx) > CHART_MARGIN.left + plotW / 2 ? xAt(activeIdx) - tooltipW - 10 : xAt(activeIdx) + 10)
    : 0;
  const tipY = CHART_MARGIN.top + 4;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        height={CHART_H}
        style={{ display: "block", touchAction: "none", cursor: "crosshair" }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => { if (!pinned) setHoverIdx(null); }}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={CHART_MARGIN.left} x2={CHART_W - CHART_MARGIN.right} y1={yAt(t)} y2={yAt(t)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={CHART_MARGIN.left - 8} y={yAt(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-ink-faint)">{moneyCompact(t)}</text>
          </g>
        ))}

        {xTickIdxs.map((i) => (
          <text key={i} x={xAt(i)} y={CHART_H - 10} textAnchor="middle" fontSize="10" fill="var(--color-ink-faint)">
            {dateAt(i).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </text>
        ))}

        {referenceLow != null && referenceHigh != null && (
          <>
            <line x1={CHART_MARGIN.left} x2={CHART_W - CHART_MARGIN.right} y1={yAt(referenceHigh)} y2={yAt(referenceHigh)} stroke="var(--color-ink-faint)" strokeWidth={1} strokeDasharray="4,3" />
            <line x1={CHART_MARGIN.left} x2={CHART_W - CHART_MARGIN.right} y1={yAt(referenceLow)} y2={yAt(referenceLow)} stroke="var(--color-ink-faint)" strokeWidth={1} strokeDasharray="4,3" />
            <text x={CHART_W - CHART_MARGIN.right} y={yAt(referenceHigh) - 4} textAnchor="end" fontSize="9" fill="var(--color-ink-faint)">
              today&apos;s suggested range
            </text>
          </>
        )}

        <path d={bandPath} fill="var(--color-accent-soft)" stroke="none" />
        <polyline points={midPoints} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {first && (
          <circle cx={xAt(0)} cy={yAt(first.mid)} r={4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
        )}
        {last && (
          <>
            <circle cx={xAt(n - 1)} cy={yAt(last.mid)} r={5} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
            <text x={xAt(n - 1) - 4} y={yAt(last.mid) - 10} textAnchor="end" fontSize="11" fontWeight={600} fill="var(--color-ink)">
              {money(last.mid)}
            </text>
          </>
        )}

        {active && activeIdx !== null && (
          <>
            <line x1={xAt(activeIdx)} x2={xAt(activeIdx)} y1={CHART_MARGIN.top} y2={CHART_MARGIN.top + plotH} stroke="var(--color-ink-faint)" strokeWidth={1} strokeDasharray="2,2" />
            <circle cx={xAt(activeIdx)} cy={yAt(active.mid)} r={4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
            <rect x={tipX} y={tipY} width={tooltipW} height={tooltipH} rx={6} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1} />
            <text x={tipX + 9} y={tipY + 16} fontSize="9.5" fill="var(--color-ink-soft)">
              {dateAt(activeIdx).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · Week {active.week}
            </text>
            <text x={tipX + 9} y={tipY + 33} fontSize="12" fontWeight={700} fill="var(--color-ink)">
              Est. {money(active.mid)}
            </text>
            <text x={tipX + 9} y={tipY + 49} fontSize="9.5" fill="var(--color-ink-soft)">
              Range {money(active.low)}–{money(active.high)}
            </text>
          </>
        )}
      </svg>
      <div style={{ fontSize: "10.5px", color: "var(--color-ink-faint)", marginTop: "4px" }}>
        {pinned ? "Tap the same point again to unpin, or tap another point." : "Hover — or tap on a phone — any point for that week's exact numbers."}
      </div>
    </div>
  );
}
