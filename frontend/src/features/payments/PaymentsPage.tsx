"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import {
  nameById,
  useContracts,
  useCreators,
  useDeals,
  usePayments,
} from "@/shared/lib/brand-queries";
import { formatInr } from "@/shared/lib/format-currency";
import { paymentStatusVariant } from "@/shared/lib/status-variants";
import page from "@/shared/components/shell/page.module.css";

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

/** Brand: every invoice across deals, with totals. Invoices are raised and updated on the deal page. */
export default function PaymentsPage() {
  const payments = usePayments();
  const contracts = useContracts().data;
  const deals = useDeals().data;
  const names = nameById(useCreators().data);
  const [status, setStatus] = useState("all");

  const all = payments.data ?? [];
  const dealOf = (contractId: string) => {
    const dealId = contracts?.find((c) => c.id === contractId)?.deal_id;
    return deals?.find((d) => d.id === dealId);
  };
  const total = (s: string) =>
    all.filter((p) => p.status === s).reduce((sum, p) => sum + Number(p.amount_inr), 0);
  const visible = all.filter((p) => status === "all" || p.status === status);

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Receipt}
        title="Payments"
        subtitle="Invoices across your deals — open a deal to raise or update one"
      />
      {payments.error && !payments.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load invoices. Try refreshing.
        </p>
      )}
      <div className={page.kpis}>
        <section className={page.kpi} aria-label="Pending">
          <span>Pending</span>
          <strong>{formatInr(total("pending"))}</strong>
        </section>
        <section className={page.kpi} aria-label="Overdue">
          <span>Overdue</span>
          <strong className={total("overdue") ? page.danger : undefined}>
            {formatInr(total("overdue"))}
          </strong>
        </section>
        <section className={page.kpi} aria-label="Paid">
          <span>Paid</span>
          <strong>{formatInr(total("paid"))}</strong>
        </section>
      </div>
      <div className={page.filters}>
        <select
          className="field"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All invoices</option>
          {Object.entries(PAYMENT_LABEL).map(([value, label]) => (
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
              <th>Invoice</th>
              <th>Deal</th>
              <th>Creator</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const deal = dealOf(p.contract_id);
              return (
                <tr key={p.id}>
                  <td>{p.invoice_number}</td>
                  <td>
                    {deal ? <Link href={`/deals/${deal.id}`}>{deal.campaign_name}</Link> : "—"}
                  </td>
                  <td>{deal ? (names[deal.creator_id] ?? "—") : "—"}</td>
                  <td>{formatInr(Number(p.amount_inr))}</td>
                  <td>{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
                  <td>
                    <StatusPill
                      status={PAYMENT_LABEL[p.status] ?? p.status}
                      variant={paymentStatusVariant(p.status)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className={page.empty}>
            {!payments.data
              ? "Loading…"
              : all.length
                ? "No invoices match this filter."
                : "No invoices yet — raise one from a deal."}
          </p>
        )}
      </div>
    </>
  );
}
