"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Handshake, MessageCircle, ShieldCheck, Upload } from "lucide-react";
import client, { API_BASE_URL, postWithSession } from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { DEAL_STAGE_LABEL } from "@/shared/constants/deal-stages";
import {
  nameById,
  useContracts,
  useCreators,
  useDeals,
  useDeliverables,
  usePayments,
  type Contract,
  type Deal,
} from "@/shared/lib/brand-queries";
import { formatInr } from "@/shared/lib/format-currency";
import { contractStatusVariant, paymentStatusVariant } from "@/shared/lib/status-variants";
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_OPTIONS } from "@/features/contracts";
import {
  DELIVERABLE_STATUS_LABEL,
  deliverableStatusVariant,
  getBrandAvailableStatuses,
} from "@/features/deliverables";
import page from "@/shared/components/shell/page.module.css";
import shell from "@/shared/components/shell/shell.module.css";

type ContractStatus = components["schemas"]["ContractStatusUpdateRequest"]["status"];
type DeliverableStatus = components["schemas"]["DeliverableStatusUpdateRequest"]["status"];
type DealStatus = components["schemas"]["DealStatusUpdateRequest"]["status"];
type PaymentStatus = "pending" | "paid" | "overdue";

const TABS = ["Contract", "Deliverables", "Payments"] as const;
type Tab = (typeof TABS)[number];
const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

/** The deal stage that follows a contract status change (accepting a contract starts production, etc.). */
function stageAfterContract(deal: Deal, from: string, to: string): DealStatus | null {
  if (to === "signed") return "in_production";
  if (from === "signed" && to === "uploaded") return "contracted";
  if (to === "draft" && ["in_production", "contracted"].includes(deal.status)) return "negotiating";
  return null;
}

/** Brand: one deal and everything on it — the only place contracts, deliverables and invoices are changed. */
export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const deals = useDeals();
  const contractsQ = useContracts();
  const deliverablesQ = useDeliverables();
  const paymentsQ = usePayments();
  const names = nameById(useCreators().data);
  const [tab, setTab] = useState<Tab>("Contract");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deal = deals.data?.find((d) => d.id === id);
  const contracts = (contractsQ.data ?? []).filter((c) => c.deal_id === id);
  const contractIds = new Set(contracts.map((c) => c.id));
  const deliverables = (deliverablesQ.data ?? []).filter((d) => d.deal_id === id);
  const payments = (paymentsQ.data ?? []).filter((p) => contractIds.has(p.contract_id));
  const { refresh: refreshDeals } = deals;

  useEffect(() => {
    // opening the deal marks it read for the brand (clears the "New" badge)
    client.POST("/deals/{id}/view", { params: { path: { id } } }).then(() => refreshDeals());
  }, [id, refreshDeals]);

  /** Runs a change, shows `failure` if it didn't work, then re-reads the affected lists. */
  async function run(failure: string, change: () => Promise<boolean>, ...after: (() => unknown)[]) {
    setBusy(true);
    setError(null);
    const ok = await change().catch(() => false);
    setBusy(false);
    if (!ok) setError(failure);
    await Promise.all(after.map((f) => f()));
    return ok;
  }

  const setStage = (status: DealStatus) =>
    run(
      "Couldn't change the deal stage.",
      async () =>
        !(
          await client.PATCH("/deals/{id}/status", {
            params: { path: { id } },
            body: { status },
          })
        ).error,
      deals.refresh,
    );

  const setContractStatus = (c: Contract, status: string) =>
    run(
      "Couldn't update the contract — it may have an open review flag that needs resolving first.",
      async () => {
        const res = await client.PATCH("/contracts/{id}/status", {
          params: { path: { id: c.id } },
          body: { status: status as ContractStatus },
        });
        if (res.error) return false;
        const next = deal && stageAfterContract(deal, c.status, status);
        if (next) {
          await client.PATCH("/deals/{id}/status", {
            params: { path: { id } },
            body: { status: next },
          });
        }
        return true;
      },
      contractsQ.refresh,
      deals.refresh,
    );

  async function uploadContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const file = (formEl.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    const ok = await run(
      "Couldn't upload the contract.",
      async () => (await postWithSession(`/deals/${id}/contracts`, file)).ok,
      contractsQ.refresh,
    );
    if (ok) formEl.reset();
  }

  async function addDeliverable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const ok = await run(
      "Couldn't add the deliverable.",
      async () =>
        !(
          await client.POST("/deals/{deal_id}/deliverables", {
            params: { path: { deal_id: id } },
            body: {
              deal_id: id,
              contract_id: String(form.get("contract_id") || "") || null,
              title: String(form.get("title")).trim(),
              description: String(form.get("description")).trim(),
            },
          })
        ).error,
      deliverablesQ.refresh,
    );
    if (ok) formEl.reset();
  }

  const setDeliverableStatus = (deliverableId: string, status: string) =>
    run(
      "Couldn't update the deliverable.",
      async () =>
        !(
          await client.PATCH("/deliverables/{id}/status", {
            params: { path: { id: deliverableId }, query: { deal_id: id } },
            body: { status: status as DeliverableStatus },
          })
        ).error,
      deliverablesQ.refresh,
    );

  async function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const ok = await run(
      "Couldn't create the invoice.",
      async () =>
        !(
          await client.POST("/payments", {
            params: { query: { deal_id: id } },
            body: {
              contract_id: String(form.get("contract_id")),
              deliverable_id: String(form.get("deliverable_id") || "") || null,
              amount_inr: Number(form.get("amount_inr")),
              platform_fee_inr: Number(form.get("platform_fee_inr") || 0),
              due_date: String(form.get("due_date") || "") || null,
            },
          })
        ).error,
      paymentsQ.refresh,
    );
    if (ok) formEl.reset();
  }

  const setPaymentStatus = (paymentId: string, contractId: string, status: PaymentStatus) =>
    run(
      "Couldn't update the invoice.",
      async () =>
        !(
          await client.PATCH("/payments/{contract_id}/status", {
            params: {
              path: { contract_id: contractId },
              query: { payment_id: paymentId, deal_id: id },
            },
            body: { status },
          })
        ).error,
      paymentsQ.refresh,
    );

  if (!deal) {
    return (
      <p className={page.empty}>
        {deals.data ? (
          <>
            Deal not found. <Link href="/deals">Back to deals</Link>
          </>
        ) : deals.error ? (
          "Couldn't load this deal. Try refreshing."
        ) : (
          "Loading…"
        )}
      </p>
    );
  }

  const invoiced = payments.reduce((sum, p) => sum + Number(p.amount_inr), 0);
  const paid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount_inr), 0);
  const creatorName = names[deal.creator_id] ?? "Creator";

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Handshake}
        title={deal.campaign_name}
        crumb={`Deals › ${deal.campaign_name}`}
        subtitle={`${creatorName} · ${deal.contact_email}`}
        actions={
          <>
            <Link href={`/chat?creator=${deal.creator_id}`} className="btn btn-outline btn-row">
              <MessageCircle size={14} /> Message
            </Link>
            <label className={page.row}>
              <span className={page.muted}>Stage</span>
              <select
                className={`field ${page.select}`}
                value={deal.status}
                disabled={busy}
                onChange={(e) => setStage(e.target.value as DealStatus)}
                aria-label="Deal stage"
              >
                {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      <div className={page.kpis}>
        <section className={page.kpi} aria-label="Creator">
          <span>Creator</span>
          <strong>
            <Link href={`/creators/${deal.creator_id}`}>{creatorName}</Link>
          </strong>
        </section>
        <section className={page.kpi} aria-label="Deal value">
          <span>Deal value</span>
          <strong>{deal.value_inr != null ? formatInr(Number(deal.value_inr)) : "—"}</strong>
        </section>
        <section className={page.kpi} aria-label="Invoiced">
          <span>Invoiced</span>
          <strong>{formatInr(invoiced)}</strong>
        </section>
        <section className={page.kpi} aria-label="Paid">
          <span>Paid</span>
          <strong>{formatInr(paid)}</strong>
        </section>
      </div>

      <nav className={shell.tabs} aria-label="Deal sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? shell.tabOn : undefined}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Deliverables" && ` (${deliverables.length})`}
            {t === "Payments" && ` (${payments.length})`}
          </button>
        ))}
      </nav>
      {error && (
        <p className={page.errorBox} role="alert">
          {error}
        </p>
      )}

      {tab === "Contract" && (
        <section className={page.card}>
          <div className={page.cardHead}>
            <div>
              <h2>Contract</h2>
              <p className={page.cardSub}>
                Upload the contract PDF; red-flag clauses are found automatically.
              </p>
            </div>
            <a
              href={`${API_BASE_URL}/contracts/sample-contract-pdf`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-text btn-row"
            >
              <Download size={14} /> Sample PDF
            </a>
          </div>
          {contracts.length === 0 ? (
            <p className={page.muted}>No contract uploaded yet.</p>
          ) : (
            <ul className={page.list}>
              {contracts.map((c) => (
                <li key={c.id}>
                  <span className={page.grow}>
                    Contract {c.id.slice(0, 8)}
                    <small>Uploaded {new Date(c.created_at).toLocaleDateString()}</small>
                  </span>
                  <StatusPill
                    status={CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                    variant={contractStatusVariant(c.status)}
                  />
                  <select
                    className={`field ${page.select}`}
                    value={c.status}
                    disabled={busy}
                    onChange={(e) => setContractStatus(c, e.target.value)}
                    aria-label="Contract status"
                  >
                    {CONTRACT_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {CONTRACT_STATUS_LABEL[s]}
                      </option>
                    ))}
                    {c.status === "pending_review" && (
                      <option value="pending_review">{CONTRACT_STATUS_LABEL.pending_review}</option>
                    )}
                  </select>
                  <Link href={`/contracts/${c.id}/clauses`} className="btn btn-text btn-row">
                    <ShieldCheck size={14} /> Review clauses
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <form className={page.inlineForm} onSubmit={uploadContract}>
            <label>
              Upload contract (PDF)
              <input name="file" type="file" accept="application/pdf" required className="field" />
            </label>
            {/* the upload also runs the red-flag clause scan, which can take a few seconds */}
            <button className="btn btn-row" type="submit" disabled={busy}>
              <Upload size={14} /> {busy ? "Uploading & scanning…" : "Upload"}
            </button>
          </form>
        </section>
      )}

      {tab === "Deliverables" && (
        <section className={page.card}>
          <h2>Deliverables</h2>
          <p className={page.cardSub}>What the creator delivers for this campaign</p>
          {deliverables.length === 0 ? (
            <p className={page.muted}>No deliverables yet.</p>
          ) : (
            <ul className={page.list}>
              {deliverables.map((d) => (
                <li key={d.id}>
                  <span className={page.grow}>
                    {d.title}
                    <small>{d.description}</small>
                  </span>
                  <StatusPill
                    status={DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}
                    variant={deliverableStatusVariant(d.status)}
                  />
                  <select
                    className={`field ${page.select}`}
                    value={d.status}
                    disabled={busy}
                    onChange={(e) => setDeliverableStatus(d.id, e.target.value)}
                    aria-label={`Status of ${d.title}`}
                  >
                    {getBrandAvailableStatuses(d).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          <form className={page.inlineForm} onSubmit={addDeliverable}>
            <label>
              Title
              <input name="title" required maxLength={200} className="field" />
            </label>
            <label>
              Description
              <input name="description" required maxLength={2000} className="field" />
            </label>
            <label>
              Contract
              <select name="contract_id" className="field" defaultValue="">
                <option value="">Not tied to a contract</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    Contract {c.id.slice(0, 8)} · {CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit" disabled={busy}>
              Add deliverable
            </button>
          </form>
        </section>
      )}

      {tab === "Payments" && (
        <section className={page.card}>
          <h2>Payments</h2>
          <p className={page.cardSub}>Invoices raised against this deal&apos;s contract</p>
          {payments.length === 0 ? (
            <p className={page.muted}>No invoices yet.</p>
          ) : (
            <ul className={page.list}>
              {payments.map((p) => (
                <li key={p.id}>
                  <span className={page.grow}>
                    {p.invoice_number}
                    <small>
                      {deliverables.find((d) => d.id === p.deliverable_id)?.title ??
                        "Whole contract"}
                      {p.due_date && ` · due ${new Date(p.due_date).toLocaleDateString()}`}
                    </small>
                  </span>
                  <strong>{formatInr(Number(p.amount_inr))}</strong>
                  <StatusPill
                    status={PAYMENT_LABEL[p.status] ?? p.status}
                    variant={paymentStatusVariant(p.status)}
                  />
                  <select
                    className={`field ${page.select}`}
                    value={p.status}
                    disabled={busy}
                    onChange={(e) =>
                      setPaymentStatus(p.id, p.contract_id, e.target.value as PaymentStatus)
                    }
                    aria-label={`Status of ${p.invoice_number}`}
                  >
                    {Object.entries(PAYMENT_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          {contracts.length === 0 ? (
            <p className={page.muted}>Upload a contract before creating an invoice.</p>
          ) : (
            <form className={page.inlineForm} onSubmit={createInvoice}>
              <label>
                Contract
                <select
                  name="contract_id"
                  required
                  className="field"
                  defaultValue={contracts[0].id}
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      Contract {c.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Deliverable
                <select name="deliverable_id" className="field" defaultValue="">
                  <option value="">Whole contract</option>
                  {deliverables.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount (₹)
                <input
                  name="amount_inr"
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  className="field"
                />
              </label>
              <label>
                Platform fee (₹)
                <input
                  name="platform_fee_inr"
                  type="number"
                  min={0}
                  step="0.01"
                  className="field"
                />
              </label>
              <label>
                Due date
                <input name="due_date" type="date" className="field" />
              </label>
              <button className="btn" type="submit" disabled={busy}>
                Create invoice
              </button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
