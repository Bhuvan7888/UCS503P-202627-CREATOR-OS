"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { nameById, useContracts, useCreators, useDeals } from "@/shared/lib/brand-queries";
import { contractStatusVariant } from "@/shared/lib/status-variants";
import page from "@/shared/components/shell/page.module.css";
import { CONTRACT_STATUS_LABEL } from "./constants/contract-status";

/** Brand: every contract across deals. Uploads and status changes happen on the deal page. */
export default function ContractsPage() {
  const contracts = useContracts();
  const creators = useCreators().data;
  const deals = useDeals().data;
  const names = nameById(creators);
  const [creator, setCreator] = useState("all");
  const [status, setStatus] = useState("all");

  const dealOf = (dealId?: string | null) => deals?.find((d) => d.id === dealId);
  const visible = (contracts.data ?? []).filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (creator === "all" || dealOf(c.deal_id)?.creator_id === creator),
  );

  return (
    <>
      <PageHeader
        base="/brand"
        icon={FileText}
        title="Contracts"
        subtitle="Contracts across your deals — open a deal to upload or change one"
      />
      {contracts.error && !contracts.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load contracts. Try refreshing.
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
          {Object.entries(CONTRACT_STATUS_LABEL).map(([value, label]) => (
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
              <th>Deal</th>
              <th>Creator</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Clauses</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const deal = dealOf(c.deal_id);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/deals/${c.deal_id}`}>{deal?.campaign_name ?? "Open deal"}</Link>
                  </td>
                  <td>{deal ? (names[deal.creator_id] ?? "—") : "—"}</td>
                  <td>
                    <StatusPill
                      status={CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                      variant={contractStatusVariant(c.status)}
                    />
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/contracts/${c.id}/clauses`}>Review clauses →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className={page.empty}>
            {!contracts.data
              ? "Loading…"
              : contracts.data.length
                ? "No contracts match these filters."
                : "No contracts yet — upload one from a deal."}
          </p>
        )}
      </div>
    </>
  );
}
