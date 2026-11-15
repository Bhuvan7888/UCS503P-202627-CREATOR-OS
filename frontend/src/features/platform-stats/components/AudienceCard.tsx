import React from "react";
import type { components } from "@/shared/lib/api-types";
import { PLATFORM_LABEL, PLATFORMS } from "@/shared/constants/platforms";
import page from "@/shared/components/shell/page.module.css";

type Audience = components["schemas"]["CreatorAudience"];

const color = Object.fromEntries(PLATFORMS.map((p) => [p.value, p.color]));
const fmt = (n: number) => n.toLocaleString();
const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Followers, engagement and weekly views per platform, with the change since the last update. */
export function AudienceCard({
  audience,
  title,
  subtitle,
  action,
  emptyText,
}: {
  audience: Audience | undefined;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  emptyText: React.ReactNode;
}) {
  return (
    <section className={page.card}>
      <div className={page.cardHead}>
        <div>
          <h2>{title}</h2>
          <p className={page.cardSub}>
            {subtitle}
            {audience?.as_of && ` · as of ${day(audience.as_of)}`}
          </p>
        </div>
        {action}
      </div>
      {!audience ? (
        <p className={page.muted}>Loading…</p>
      ) : audience.platforms.length === 0 ? (
        <p className={page.muted}>{emptyText}</p>
      ) : (
        <>
          <p className={page.muted}>
            Total followers <strong>{fmt(audience.total_followers)}</strong>
          </p>
          <ul className={page.list} aria-label="Platform analytics">
            {audience.platforms.map((p) => (
              <li key={p.platform}>
                <span
                  aria-hidden
                  className={page.swatch}
                  style={{ background: color[p.platform] }}
                />
                <span className={page.grow}>
                  {PLATFORM_LABEL[p.platform]}
                  <small>
                    {[
                      p.engagement_rate != null && `${p.engagement_rate}% engagement`,
                      p.avg_views != null && `${fmt(p.avg_views)} weekly views`,
                      `updated ${day(p.recorded_at)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <span className={`${page.grow} ${page.end}`}>
                  <strong>{fmt(p.followers_count)}</strong>
                  {p.change != null && p.previous_recorded_at && (
                    <small>
                      {p.change >= 0 ? "+" : "−"}
                      {fmt(Math.abs(p.change))} since {day(p.previous_recorded_at)}
                    </small>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
