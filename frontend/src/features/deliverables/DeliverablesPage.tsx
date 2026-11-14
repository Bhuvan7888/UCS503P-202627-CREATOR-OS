"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { nameById, useCreators, useDeals, useDeliverables } from "@/shared/lib/brand-queries";
import page from "@/shared/components/shell/page.module.css";
import { DELIVERABLE_STATUS_LABEL } from "./constants/deliverable-status";
import { deliverableStatusVariant } from "./utils/deliverable-status.utils";

/** Brand: every deliverable across deals. Adding one or changing its status happens on the deal page. */
export default function DeliverablesPage() {
  const deliverables = useDeliverables();
  const creators = useCreators().data;
  const deals = useDeals().data;
  const names = nameById(creators);
  const [creator, setCreator] = useState("all");
  const [status, setStatus] = useState("all");

  const dealOf = (dealId: string) => deals?.find((d) => d.id === dealId);
  const visible = (deliverables.data ?? []).filter(
    (d) =>
      (status === "all" || d.status === status) &&
      (creator === "all" || dealOf(d.deal_id)?.creator_id === creator),
  );

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Package}
        title="Deliverables"
        subtitle="What creators deliver across your deals — open a deal to add or update one"
      />
      {deliverables.error && !deliverables.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load deliverables. Try refreshing.
        </p>
      )}
      <div className={page.filters}>
        <select
          className="field"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          aria-label="Filter by creator"
        >
          <option value="all">All creators</option>
          {(creators ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {Object.entries(DELIVERABLE_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className={page.tableWrap}>
        <table className={page.table}>
          <thead>
            <tr>
              <th>Deliverable</th>
              <th>Deal</th>
              <th>Creator</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => {
              const deal = dealOf(d.deal_id);
              return (
                <tr key={d.id}>
                  <td>
                    <span className={page.grow}>
                      {d.title}
                      <small>{d.description}</small>
                    </span>
                  </td>
                  <td>
                    <Link href={`/deals/${d.deal_id}`}>{deal?.campaign_name ?? "Open deal"}</Link>
                  </td>
                  <td>{deal ? (names[deal.creator_id] ?? "—") : "—"}</td>
                  <td>
                    <StatusPill
                      status={DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}
                      variant={deliverableStatusVariant(d.status)}
                    />
                  </td>
                  <td>{new Date(d.updated_at ?? d.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className={page.empty}>
            {!deliverables.data
              ? "Loading…"
              : deliverables.data.length
                ? "No deliverables match these filters."
                : "No deliverables yet — add one from a deal."}
          </p>
        )}
      </div>
    </>
  );
}
