"use client";

import React, { use } from "react";
import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { DEAL_STAGE_LABEL } from "@/shared/constants/deal-stages";
import { useContracts, useCreators, useDeals, usePayments } from "@/shared/lib/brand-queries";
import { formatInr } from "@/shared/lib/format-currency";
import { dealStatusVariant } from "@/shared/lib/status-variants";
import page from "@/shared/components/shell/page.module.css";

/** Brand: one creator's profile and their deals with you (work on a deal happens on its page). */
export default function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const creators = useCreators();
  const deals = (useDeals().data ?? []).filter((d) => d.creator_id === id);
  const contracts = useContracts().data ?? [];
  const payments = usePayments().data ?? [];
  const creator = creators.data?.find((c) => c.id === id);

  if (!creator) {
    return (
      <p className={page.empty}>
        {creators.data ? (
          <>
            Creator not found. <Link href="/creators">Back to creators</Link>
          </>
        ) : (
          "Loading…"
        )}
      </p>
    );
  }

  const dealIds = new Set(deals.map((d) => d.id));
  const contractIds = new Set(
    contracts.filter((c) => dealIds.has(c.deal_id ?? "")).map((c) => c.id),
  );
  const mine = payments.filter((p) => contractIds.has(p.contract_id));
  const sum = (paid: boolean) =>
    mine
      .filter((p) => (p.status === "paid") === paid)
      .reduce((total, p) => total + Number(p.amount_inr), 0);
  const active = deals.filter((d) => !["completed", "cancelled"].includes(d.status)).length;
  const facts = [
    `@${creator.instagram_handle.replace(/^@/, "")}`,
    `${creator.niche} · ${creator.follower_tier}`,
    creator.followers_count != null && `${creator.followers_count.toLocaleString()} followers`,
    creator.engagement_rate != null && `${creator.engagement_rate}% engagement`,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Users}
        title={creator.display_name}
        crumb={`Creators › ${creator.display_name}`}
        subtitle={facts.join(" · ")}
        actions={
          <Link href={`/chat?creator=${creator.id}`} className="btn btn-outline btn-row">
            <MessageCircle size={14} /> Message
          </Link>
        }
      />
      <div className={page.kpis}>
        <section className={page.kpi} aria-label="Deals">
          <span>Deals</span>
          <strong>{deals.length}</strong>
        </section>
        <section className={page.kpi} aria-label="Active">
          <span>Active</span>
          <strong>{active}</strong>
        </section>
        <section className={page.kpi} aria-label="Paid to date">
          <span>Paid to date</span>
          <strong>{formatInr(sum(true))}</strong>
        </section>
        <section className={page.kpi} aria-label="Outstanding">
          <span>Outstanding</span>
          <strong>{formatInr(sum(false))}</strong>
        </section>
      </div>
      <section className={page.card}>
        <div className={page.cardHead}>
          <div>
            <h2>Deals</h2>
            <p className={page.cardSub}>Campaigns with {creator.display_name}</p>
          </div>
          <Link href="/deals?new=1" className="btn btn-text">
            New deal
          </Link>
        </div>
        {deals.length ? (
          <ul className={page.list}>
            {deals.map((d) => (
              <li key={d.id}>
                <span className={page.grow}>
                  <Link href={`/deals/${d.id}`}>{d.campaign_name}</Link>
                  <small>Started {new Date(d.created_at).toLocaleDateString()}</small>
                </span>
                {d.value_inr != null && <strong>{formatInr(Number(d.value_inr))}</strong>}
                <StatusPill
                  status={DEAL_STAGE_LABEL[d.status] ?? d.status}
                  variant={dealStatusVariant(d.status)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={page.muted}>No deals with this creator yet.</p>
        )}
      </section>
    </>
  );
}
