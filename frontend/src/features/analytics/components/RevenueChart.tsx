"use client";

import React, { useState } from "react";
import type { components } from "@/shared/lib/api-types";
import { formatInr } from "@/shared/lib/format-currency";
import styles from "./revenue-chart.module.css";

type Month = components["schemas"]["BrandAnalytics"]["revenue_by_month"][number];

const PLOT_HEIGHT = 180; // px, matches .chart's first row
const SERIES = [
  { key: "paid", label: "Paid", className: styles.paid },
  { key: "pending", label: "Pending", className: styles.pending },
  { key: "overdue", label: "Overdue", className: styles.overdue },
] as const;

const compactInr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Smallest "nice" axis top (1, 2, 2.5 or 5 × 10ⁿ) at or above `value`. */
function niceCeil(value: number): number {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 2.5, 5, 10].find((f) => f * power >= value) ?? 10) * power;
}

const monthName = (ym: string, style: "short" | "long") =>
  new Date(`${ym}-01T00:00:00`).toLocaleString("en-IN", {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
  });

const total = (m: Month) => m.paid + m.pending + m.overdue;

/** Brand Home: invoices raised in the last 6 months, stacked by payment status, with totals. */
export function RevenueChart({ data: raw }: { data: Month[] }) {
  // an older API (mid-deploy) sends no `overdue`
  const data = raw.map((m) => ({ ...m, overdue: m.overdue ?? 0 }));
  const [active, setActive] = useState<number | null>(null);
  const sum = (key: (typeof SERIES)[number]["key"]) => data.reduce((s, m) => s + m[key], 0);
  const top = niceCeil(Math.max(...data.map(total), 0));
  const ticks = [top, top / 2, 0];
  const empty = data.every((m) => total(m) === 0);

  return (
    <div>
      <div className={styles.figures}>
        <div className={styles.figure}>
          <span>Invoiced · 6 months</span>
          <strong>{formatInr(data.reduce((s, m) => s + total(m), 0))}</strong>
        </div>
        {SERIES.map((s) => (
          <div key={s.key} className={styles.figure}>
            <span>
              <i className={`${styles.swatch} ${s.className}`} aria-hidden />
              {s.label}
            </span>
            <strong>{formatInr(sum(s.key))}</strong>
          </div>
        ))}
      </div>

      {/* visual only — the table below carries the same numbers for screen readers */}
      <div className={styles.chart} aria-hidden>
        <div className={styles.axis}>
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
              {compactInr.format(t)}
            </span>
          ))}
        </div>
        <div className={styles.plot} onMouseLeave={() => setActive(null)}>
          {ticks.slice(0, 2).map((t) => (
            <span key={t} className={styles.grid} style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          {empty && <p className={styles.emptyNote}>No invoices in the last 6 months</p>}
          {data.map((m, i) => (
            <div key={m.month} className={styles.col} onMouseEnter={() => setActive(i)}>
              <div className={styles.stack}>
                {SERIES.filter((s) => m[s.key] > 0).map((s) => (
                  <span
                    key={s.key}
                    className={s.className}
                    style={{ height: `${(m[s.key] / top) * PLOT_HEIGHT}px` }}
                  />
                ))}
              </div>
              {active === i && !empty && (
                // right-half months open the tooltip to the left so it stays inside the card
                <div className={`${styles.tip} ${i >= data.length / 2 ? styles.tipLeft : ""}`}>
                  <p>{monthName(m.month, "long")}</p>
                  {SERIES.map((s) => (
                    <div key={s.key}>
                      <i className={`${styles.swatch} ${s.className}`} />
                      {s.label}
                      <b>{formatInr(m[s.key])}</b>
                    </div>
                  ))}
                  <div>
                    Total<b>{formatInr(total(m))}</b>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.months}>
          {data.map((m, i) => (
            <span key={m.month} className={i === data.length - 1 ? styles.now : undefined}>
              {monthName(m.month, "short")}
            </span>
          ))}
        </div>
      </div>

      <table className={styles.srOnly}>
        <caption>Invoices by month and payment status</caption>
        <thead>
          <tr>
            <th>Month</th>
            {SERIES.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <td>{monthName(m.month, "long")}</td>
              {SERIES.map((s) => (
                <td key={s.key}>{formatInr(m[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
