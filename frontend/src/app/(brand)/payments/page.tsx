"use client";

import React, { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import client from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Payment = components["schemas"]["Payment"];
type Contract = components["schemas"]["Contract"];
type Deliverable = components["schemas"]["Deliverable"];

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isBrand, setIsBrand] = useState(false);
  const [formError, setFormError] = useState("");

  function reload() {
    client.GET("/payments", { params: { query: { limit: 100 } } }).then(({ data, error: apiError }) => {
      if (apiError) { setError(true); return; }
      setItems(data ?? []);
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see AppShell.tsx
    setIsBrand(loadSession()?.role === "brand");
    reload();
    client.GET("/contracts").then(({ data }) => setContracts(data ?? []));
    client.GET("/deliverables").then(({ data }) => setDeliverables(data ?? []));
  }, []);

  async function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const contractId = String(form.get("contract_id"));
    const deliverableId = String(form.get("deliverable_id") || "");
    setBusy(true);
    setFormError("");
    let apiError;
    try {
      ({ error: apiError } = await client.POST("/payments", {
        params: { query: { deal_id: contracts.find((c) => c.id === contractId)?.deal_id ?? "" } },
        body: {
          contract_id: contractId,
          deliverable_id: deliverableId || null,
          amount_inr: Number(form.get("amount_inr")),
          platform_fee_inr: Number(form.get("platform_fee_inr") || 0),
          due_date: String(form.get("due_date") || "") || null,
        },
      }));
    } catch {
      apiError = true;
    }
    setBusy(false);
    if (apiError) { setFormError("Couldn't create the invoice."); return; }
    formEl.reset();
    setSelectedContractId("");
    setShowForm(false);
    reload();
  }

  async function handlePaymentStatusChange(p: Payment, newStatus: "pending" | "paid" | "overdue") {
    if (newStatus === p.status) return;
    const contract = contracts.find((c) => c.id === p.contract_id);
    if (!contract || !contract.deal_id) return;
    await client.PATCH("/payments/{contract_id}/status", {
      params: {
        path: { contract_id: p.contract_id },
        query: { payment_id: p.id, deal_id: contract.deal_id },
      },
      body: { status: newStatus },
    });
    reload();
  }

  if (error) {
    return <EmptyState icon={Receipt} message="Couldn't load invoices. Try signing in again." />;
  }
  if (items === null) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }

  const dealDeliverables = deliverables.filter(
    (d) => d.deal_id === contracts.find((c) => c.id === selectedContractId)?.deal_id
  );
  const deliverableTitle = (id: string | null | undefined) => deliverables.find((d) => d.id === id)?.title;

  return (
    <>
      {isBrand && (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New invoice"}
        </button>
      </div>
      )}

      {isBrand && showForm && (
        <form onSubmit={createInvoice} className="mtile" style={{ marginBottom: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label className="text-label" style={{ gridColumn: "1 / -1" }}>Contract
            <select
              name="contract_id" required className="field"
              value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)}
            >
              <option value="">Select contract…</option>
              {contracts.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)} — {c.status}</option>)}
            </select>
          </label>
          <label className="text-label" style={{ gridColumn: "1 / -1" }}>Deliverable (optional)
            <select name="deliverable_id" className="field" disabled={!selectedContractId}>
              <option value="">— None —</option>
              {dealDeliverables.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </label>
          <label className="text-label">Amount billed to brand (₹)<input name="amount_inr" type="number" step="0.01" required className="field" /></label>
          <label className="text-label">Platform fee (₹, optional)<input name="platform_fee_inr" type="number" step="0.01" min={0} className="field" /></label>
          <label className="text-label">Due date<input name="due_date" type="date" className="field" /></label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn" disabled={busy} type="submit">Create invoice</button>
          </div>
        </form>
      )}

      {formError && <div style={{ fontSize: "12px", color: "var(--color-danger)", marginBottom: "10px" }}>{formError}</div>}

      {items.length === 0 ? (
        <EmptyState icon={Receipt} message="No invoices yet. Create one once a contract is signed." />
      ) : (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
        <thead>
          <tr style={{ color: "var(--color-ink-faint)", textAlign: "left" }}>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Invoice #</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Deliverable</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Amount</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Due</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>{p.invoice_number}</td>
              <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)", color: "var(--color-ink-soft)" }}>
                {deliverableTitle(p.deliverable_id) ?? "—"}
              </td>
              <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                ₹{Number(isBrand ? p.amount_inr : p.net_amount_inr).toLocaleString()}
                {!isBrand && Number(p.platform_fee_inr) > 0 && (
                  <span style={{ color: "var(--color-ink-faint)" }}> (after ₹{Number(p.platform_fee_inr).toLocaleString()} platform fee)</span>
                )}
              </td>
              <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)", color: "var(--color-ink-soft)" }}>
                {p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}
              </td>
              <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                {isBrand ? (
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
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
                        minWidth: "120px",
                        fontSize: "12.5px",
                        padding: "6px 10px",
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
                ) : (
                  <StatusPill
                    status={p.status === "paid" ? "Paid" : p.status === "overdue" ? "Overdue" : "Not paid yet"}
                    variant={p.status === "paid" ? "success" : p.status === "overdue" ? "danger" : "warning"}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </>
  );
}
