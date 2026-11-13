"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { contractStatusVariant } from "@/shared/lib/status-variants";
import { PageHeader, useWorkspace } from "@/features/workspaces";
import styles from "./workspace-contracts.module.css";

type Contract = components["schemas"]["Contract"];
type PlatformDeal = components["schemas"]["PlatformDeal"];

/** Creator workspace: contracts brands uploaded for their Creator OS deals, each with a red-flag clause scan. */
export default function WorkspaceContractsPage() {
  const { workspace, base } = useWorkspace();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [deals, setDeals] = useState<Record<string, PlatformDeal>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      client.GET("/contracts", { params: { query: { limit: 100 } } }),
      client.GET("/workspaces/{workspace}/crm/platform-deals", {
        params: { path: { workspace: workspace.slug } },
      }),
    ]).then(([list, platform]) => {
      if (list.error || !list.data) return setError("Couldn't load your contracts.");
      setContracts(list.data);
      setDeals(Object.fromEntries((platform.data ?? []).map((d) => [d.id, d])));
    });
  }, [workspace.slug]);

  return (
    <>
      <PageHeader
        base={base}
        icon={ShieldCheck}
        title="Contracts"
        subtitle="Contracts from your brand deals, scanned for red-flag clauses"
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {contracts === null && !error && <p className={styles.muted}>Loading…</p>}
      {contracts?.length === 0 && (
        <section className={styles.empty}>
          <FileText size={28} />
          <h2>No contracts yet</h2>
          <p>
            When a brand uploads a contract for one of your deals on Creator OS, it appears here
            with a clause scan.
          </p>
        </section>
      )}
      {!!contracts?.length && (
        <ul className={styles.list}>
          {contracts.map((c) => {
            const deal = c.deal_id ? deals[c.deal_id] : undefined;
            return (
              <li key={c.id}>
                <span className={styles.grow}>
                  <strong>{deal?.campaign_name ?? "Contract"}</strong>
                  <small>
                    {deal?.brand_name ?? "Brand"} · uploaded{" "}
                    {new Date(c.created_at).toLocaleDateString("en-GB")}
                  </small>
                </span>
                <StatusPill
                  status={c.status.replace(/_/g, " ")}
                  variant={contractStatusVariant(c.status)}
                />
                <Link href={`${base}/contracts/${c.id}`} className="btn btn-outline">
                  Review clauses
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
