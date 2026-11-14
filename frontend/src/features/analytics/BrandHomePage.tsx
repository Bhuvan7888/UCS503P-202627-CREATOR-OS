"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { House, Plus } from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { DEAL_STAGE_LABEL } from "@/shared/constants/deal-stages";
import { useCreators, useDeals, nameById } from "@/shared/lib/brand-queries";
import { formatInr } from "@/shared/lib/format-currency";
import { useQuery } from "@/shared/lib/query-cache";
import { loadSession } from "@/shared/lib/session";
import { dealStatusVariant } from "@/shared/lib/status-variants";
import page from "@/shared/components/shell/page.module.css";
import { BarRow } from "./components/BarRow";
import { RevenueChart } from "./components/RevenueChart";

const RECENT_DEALS = 5;

/** Brand Home: KPIs, revenue, pipeline, recent deals and roster insights (formerly the Analytics page). */
export default function BrandHomePage() {
  const analytics = useQuery(
    "brand:analytics",
    async () => (await client.GET("/analytics/brand")).data,
  );
  const deals = useDeals().data;
  const names = nameById(useCreators().data);
  const data = analytics.data;
  const [brandName, setBrandName] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is client-only
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrandName(loadSession()?.brand_name ?? null);
  }, []);

  const active = deals?.filter((d) => !["completed", "cancelled"].includes(d.status)).length;
  const completed = deals?.filter((d) => d.status === "completed").length;
  const recent = [...(deals ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_DEALS);
  const maxStage = Math.max(...Object.values(data?.deals_by_status ?? {}), 1);
  const maxCampaign = Math.max(...(data?.top_brands ?? []).map((b) => b.total_value), 1);

  return (
    <>
      <PageHeader
        base="/brand"
        icon={House}
        title={brandName ? `Welcome back, ${brandName}` : "Welcome back"}
        crumb="Overview"
        subtitle="Your creator partnerships at a glance"
        actions={
          <Link href="/deals?new=1" className="btn btn-row">
            <Plus size={14} /> New deal
          </Link>
        }
      />
      {analytics.error && !data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load your overview. Try refreshing.
        </p>
      )}

      <div className={page.kpis}>
        <section className={page.kpi} aria-label="Creators">
          <span>Creators</span>
          <strong>{data?.total_creators ?? "—"}</strong>
        </section>
        <section className={page.kpi} aria-label="Active deals">
          <span>Active deals</span>
          <strong>{active ?? "—"}</strong>
        </section>
        <section className={page.kpi} aria-label="Completed deals">
          <span>Completed deals</span>
          <strong>{completed ?? "—"}</strong>
        </section>
        <section className={page.kpi} aria-label="Overdue payments">
          <span>Overdue payments</span>
          <strong className={data?.overdue_payments_count ? page.danger : undefined}>
            {data ? data.overdue_payments_count : "—"}
          </strong>
          {!!data?.overdue_payments_count && (
            <small className={page.muted}>
              {formatInr(data.overdue_payments_total)} outstanding
            </small>
          )}
        </section>
      </div>

      <div className={page.stack}>
        <div className={page.twoUp}>
          <section className={page.card}>
            <h2>Revenue by month</h2>
            <p className={page.cardSub}>Paid and pending invoices</p>
            {data ? (
              <RevenueChart data={data.revenue_by_month} />
            ) : (
              <p className={page.muted}>Loading…</p>
            )}
          </section>
          <section className={page.card}>
            <h2>Deal pipeline</h2>
            <p className={page.cardSub}>Deals in each stage</p>
            <div className={page.stack}>
              {Object.entries(data?.deals_by_status ?? {}).map(([status, count]) => (
                <BarRow
                  key={status}
                  label={DEAL_STAGE_LABEL[status] ?? status}
                  value={count}
                  max={maxStage}
                  color="var(--color-accent)"
                />
              ))}
            </div>
          </section>
        </div>

        <div className={page.twoUp}>
          <section className={page.card}>
            <div className={page.cardHead}>
              <div>
                <h2>Recent deals</h2>
                <p className={page.cardSub}>Your latest campaigns</p>
              </div>
              <Link href="/deals" className="btn btn-text btn-row">
                View all
              </Link>
            </div>
            {recent.length ? (
              <ul className={page.list}>
                {recent.map((d) => (
                  <li key={d.id}>
                    <span className={page.grow}>
                      <Link href={`/deals/${d.id}`}>{d.campaign_name}</Link>
                      <small>{names[d.creator_id] ?? "—"}</small>
                    </span>
                    <StatusPill
                      status={DEAL_STAGE_LABEL[d.status] ?? d.status}
                      variant={dealStatusVariant(d.status)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={page.muted}>{deals ? "No deals yet." : "Loading…"}</p>
            )}
          </section>
          <section className={page.card}>
            <h2>Top campaigns</h2>
            <p className={page.cardSub}>By invoiced value</p>
            {data?.top_brands.length ? (
              <div className={page.stack}>
                {data.top_brands.map((b) => (
                  <BarRow
                    key={b.campaign_name}
                    label={b.campaign_name}
                    value={b.total_value}
                    max={maxCampaign}
                    color="var(--color-ink)"
                    format={formatInr}
                  />
                ))}
              </div>
            ) : (
              <p className={page.muted}>{data ? "No campaign revenue yet." : "Loading…"}</p>
            )}
          </section>
        </div>

        <div className={page.twoUp}>
          <section className={page.card}>
            <h2>Creator performance</h2>
            <p className={page.cardSub}>Deals and value per creator</p>
            {data?.creator_performance.length ? (
              <ul className={page.list}>
                {data.creator_performance.map((c) => (
                  <li key={c.creator_id}>
                    <span className={page.grow}>
                      <Link href={`/creators/${c.creator_id}`}>{c.display_name}</Link>
                      <small>
                        {c.niche} · {c.follower_tier} · {c.deal_count} deal
                        {c.deal_count === 1 ? "" : "s"}
                      </small>
                    </span>
                    <strong>{formatInr(c.total_value)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={page.muted}>{data ? "No creator revenue yet." : "Loading…"}</p>
            )}
          </section>
          <section className={page.card}>
            <h2>Roster by niche</h2>
            <p className={page.cardSub}>Who you work with</p>
            {data?.roster_by_niche.length ? (
              <ul className={page.list}>
                {data.roster_by_niche.map((n) => (
                  <li key={`${n.niche}-${n.follower_tier}`}>
                    <span className={page.grow}>
                      {n.niche} · {n.follower_tier}
                      {n.avg_engagement_rate != null && (
                        <small>{n.avg_engagement_rate.toFixed(1)}% avg engagement</small>
                      )}
                    </span>
                    <strong>{n.creator_count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={page.muted}>{data ? "No creators yet." : "Loading…"}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
