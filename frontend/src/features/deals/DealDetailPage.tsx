"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import client from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { loadSession } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import type { components } from "@/lib/api-types";

type Deal = components["schemas"]["Deal"];
type Creator = components["schemas"]["Creator"];
type Contract = components["schemas"]["Contract"];
type Deliverable = components["schemas"]["Deliverable"];
type Payment = components["schemas"]["Payment"];

const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead", negotiating: "Negotiating", contracted: "Contracted",
  in_production: "In production", completed: "Completed", cancelled: "Cancelled",
};

const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  pending: "Not started", in_production: "In progress", editing: "Video editing phase",
  submitted: "Delivered — awaiting approval", approved: "Approved", rejected: "Rejected", revision_requested: "Revision requested",
};

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  function reload() {
    Promise.all([
      client.GET("/deals", { params: { query: { limit: 200 } } }),
      client.GET("/contracts"),
      client.GET("/deliverables"),
      client.GET("/payments", { params: { query: { limit: 200 } } }),
    ]).then(([dealsRes, contractsRes, deliverablesRes, paymentsRes]) => {
      if (dealsRes.error) { setError(true); return; }
      const foundDeal = (dealsRes.data ?? []).find((d) => d.id === id) ?? null;
      setDeal(foundDeal);
      if (foundDeal) {
        client.GET("/creators/{id}", { params: { path: { id: foundDeal.creator_id } } })
          .then(({ data }) => setCreator(data ?? null));
      }
      setContracts((contractsRes.data ?? []).filter((c) => c.deal_id === id));
      setDeliverables((deliverablesRes.data ?? []).filter((d) => d.deal_id === id));
      const contractIds = new Set((contractsRes.data ?? []).filter((c) => c.deal_id === id).map((c) => c.id));
      setPayments((paymentsRes.data ?? []).filter((p) => contractIds.has(p.contract_id)));
    });
  }

  useEffect(() => { reload(); }, [id]);

  useEffect(() => {
    // Fire-and-forget: opening a deal's detail page marks it read for the brand.
    client.POST("/deals/{id}/view", { params: { path: { id } } });
  }, [id]);

  async function uploadContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/deals/${id}/contracts`,
      { method: "POST", headers: { Authorization: `Bearer ${loadSession()?.access_token ?? ""}` }, body }
    );
    setBusy(false);
    if (res.ok) { formEl.reset(); reload(); }
  }

  async function createDeliverable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const contractId = String(form.get("contract_id") || "");
    setBusy(true);
    await client.POST("/deals/{deal_id}/deliverables", {
      params: { path: { deal_id: id } },
      body: {
        deal_id: id,
        contract_id: contractId || null,
        title: String(form.get("title")),
        description: String(form.get("description")),
      },
    });
    setBusy(false);
    formEl.reset();
    reload();
  }

  async function handleContractStatusChange(c: Contract, newStatus: string) {
    if (newStatus === c.status) return;
    await client.PATCH("/contracts/{id}/status", {
      params: { path: { id: c.id } },
      body: { status: newStatus as any },
    });
    if (deal) {
      if (newStatus === "signed") {
        await client.PATCH("/deals/{id}/status", {
          params: { path: { id: deal.id } },
          body: { status: "in_production" },
        });
      } else if (c.status === "signed" && newStatus === "uploaded") {
        await client.PATCH("/deals/{id}/status", {
          params: { path: { id: deal.id } },
          body: { status: "contracted" },
        });
      }
    }
    reload();
  }

  async function handleDeliverableStatusChange(d: Deliverable, newStatus: string) {
    if (newStatus === d.status) return;
    await client.PATCH("/deliverables/{id}/status", {
      params: { path: { id: d.id }, query: { deal_id: id } },
      body: { status: newStatus as any },
    });
    reload();
  }

  async function handlePaymentStatusChange(p: Payment, newStatus: "pending" | "paid" | "overdue") {
    if (newStatus === p.status) return;
    await client.PATCH("/payments/{contract_id}/status", {
      params: {
        path: { contract_id: p.contract_id },
        query: { payment_id: p.id, deal_id: id },
      },
      body: { status: newStatus },
    });
    reload();
  }

  async function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const contractId = String(form.get("contract_id"));
    setBusy(true);
    await client.POST("/payments", {
      params: { query: { deal_id: id } },
      body: {
        contract_id: contractId,
        amount_inr: Number(form.get("amount_inr")),
        platform_fee_inr: Number(form.get("platform_fee_inr") || 0),
        due_date: String(form.get("due_date") || "") || null,
      },
    });
    setBusy(false);
    formEl.reset();
    reload();
  }

  async function markPaid(p: Payment) {
    await client.PATCH("/payments/{contract_id}/mark-paid", {
      params: { path: { contract_id: p.contract_id }, query: { payment_id: p.id, deal_id: id } },
    });
    reload();
  }

  if (error) return <EmptyState icon={ArrowLeft} message="Couldn't load this deal." />;
  if (deal === undefined) return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  if (!deal) return <EmptyState icon={ArrowLeft} message="Deal not found." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <Link href="/brand" style={{ fontSize: "12px", color: "var(--color-ink-soft)" }}>← Back to deals</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
          <h1 className="text-h2" style={{ margin: 0 }}>{deal.campaign_name}</h1>
          <StatusPill status={DEAL_STAGE_LABEL[deal.status] ?? deal.status} variant="accent" />
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--color-ink-soft)", marginTop: "4px" }}>
          {creator ? <Link href={`/creators/${creator.id}`} style={{ color: "var(--color-accent)" }}>{creator.display_name}</Link> : "—"}
          {" · "}{deal.contact_email}
        </div>
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Contracts</div>
        {contracts.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)", marginBottom: "10px" }}>No contract uploaded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
            {contracts.map((c) => (
              <div key={c.id} style={{ fontSize: "12.5px", display: "flex", gap: "10px", alignItems: "center" }}>
                <StatusPill
                  status={c.status === "signed" ? "Accepted" : c.status === "void" ? "Void" : c.status === "pending_review" ? "Pending review" : c.status === "draft" ? "Draft" : "Pending acceptance"}
                  variant={c.status === "signed" ? "success" : c.status === "void" ? "danger" : c.status === "pending_review" ? "warning" : "neutral"}
                />
                <select
                  className="field"
                  style={{
                    display: "inline-block",
                    margin: 0,
                    width: "auto",
                    minWidth: "150px",
                    fontSize: "12px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    background: "var(--color-surface-sunken)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 500,
                  }}
                  value={c.status}
                  onChange={(e) => handleContractStatusChange(c, e.target.value)}
                >
                  <option value="uploaded">Pending acceptance</option>
                  <option value="signed">Accepted</option>
                  <option value="draft">Draft</option>
                  <option value="void">Void</option>
                  {c.status === "pending_review" && (
                    <option value="pending_review">Pending review</option>
                  )}
                </select>
                <Link href={`/contracts/${c.id}/clauses`} style={{ color: "var(--color-accent)" }}>View clauses →</Link>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={uploadContract} style={{ display: "flex", gap: "8px", alignItems: "end" }}>
          <label className="text-label" style={{ flex: 1 }}>Upload contract (PDF)
            <input name="file" type="file" accept="application/pdf" required className="field" />
          </label>
          <button className="btn" disabled={busy} type="submit">Upload</button>
        </form>
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Deliverables</div>
        {deliverables.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
            {deliverables.map((d) => {
              const linkedContract = contracts.find((c) => c.id === d.contract_id);
              return (
                <div key={d.id} style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "12.5px" }}>
                  <div style={{ flex: 1 }}>
                    <div>{d.title}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-ink-faint)" }}>
                      {linkedContract ? `Contract ${linkedContract.id.slice(0, 8)}` : "Not tied to a contract"}
                    </div>
                  </div>
                  <StatusPill status={DELIVERABLE_STATUS_LABEL[d.status] ?? d.status} variant={d.status === "approved" ? "success" : d.status === "rejected" ? "danger" : d.status === "revision_requested" ? "warning" : "neutral"} />
                  <select
                    className="field"
                    style={{
                      display: "inline-block",
                      margin: 0,
                      width: "auto",
                      minWidth: "180px",
                      fontSize: "12px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      background: "var(--color-surface-sunken)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-ink)",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 500,
                    }}
                    value={d.status}
                    onChange={(e) => handleDeliverableStatusChange(d, e.target.value)}
                  >
                    <option value="in_production">In progress</option>
                    <option value="editing">Video editing phase</option>
                    <option value="submitted">Delivered — awaiting approval</option>
                    <option value="approved">Approved</option>
                    <option value="revision_requested">Revision requested</option>
                    <option value="rejected">Rejected</option>
                    {d.status === "pending" && <option value="pending">Not started</option>}
                  </select>
                </div>
              );
            })}
          </div>
        )}
        <form onSubmit={createDeliverable} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: "8px", alignItems: "end" }}>
          <label className="text-label">Contract
            <select name="contract_id" className="field">
              <option value="">— Not tied to a contract —</option>
              {contracts.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)} — {c.status}</option>)}
            </select>
          </label>
          <label className="text-label">Title<input name="title" required className="field" /></label>
          <label className="text-label">Description<input name="description" required className="field" /></label>
          <button className="btn" disabled={busy} type="submit">Add</button>
        </form>
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Payments</div>
        {payments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
            {payments.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "12.5px" }}>
                <span>{p.invoice_number}</span>
                <span>{money(Number(p.amount_inr))}</span>
                <StatusPill
                  status={p.status === "paid" ? "Paid" : p.status === "overdue" ? "Overdue" : "Pending"}
                  variant={p.status === "paid" ? "success" : p.status === "overdue" ? "danger" : "warning"}
                />
                <select
                  className="field"
                  style={{
                    display: "inline-block",
                    margin: 0,
                    width: "auto",
                    minWidth: "110px",
                    fontSize: "12px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    background: "var(--color-surface-sunken)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 500,
                  }}
                  value={p.status}
                  onChange={(e) => handlePaymentStatusChange(p, e.target.value as "pending" | "paid" | "overdue")}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            ))}
          </div>
        )}
        {contracts.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>Upload a contract before creating an invoice.</div>
        ) : (
          <form onSubmit={createInvoice} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
            <label className="text-label">Contract
              <select name="contract_id" required className="field">
                <option value="">Select…</option>
                {contracts.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)} — {c.status}</option>)}
              </select>
            </label>
            <label className="text-label">Amount (₹)<input name="amount_inr" type="number" step="0.01" required className="field" /></label>
            <label className="text-label">Platform fee (₹, optional)<input name="platform_fee_inr" type="number" step="0.01" min={0} className="field" /></label>
            <label className="text-label">Due date<input name="due_date" type="date" className="field" /></label>
            <button className="btn" disabled={busy} type="submit">Create invoice</button>
          </form>
        )}
      </div>
    </div>
  );
}
