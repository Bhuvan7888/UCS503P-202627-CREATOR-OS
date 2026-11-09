"use client";

import React, { useEffect, useState } from "react";
import { PackageOpen } from "lucide-react";
import client from "@/lib/api";
import { StatusPill, StatusVariant } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Deliverable = components["schemas"]["Deliverable"];
type Deal = components["schemas"]["Deal"];
type Creator = components["schemas"]["Creator"];
type Contract = components["schemas"]["Contract"];

const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead", negotiating: "Negotiating", contracted: "Contracted",
  in_production: "In production", completed: "Completed", cancelled: "Cancelled",
};

function dealStageVariant(status: string): StatusVariant {
  switch (status) {
    case "negotiating": return "warning";
    case "contracted": return "accent";
    case "in_production": return "accent";
    case "completed": return "success";
    case "cancelled": return "danger";
    default: return "neutral";
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Not started",
  in_production: "In progress",
  editing: "Video editing phase",
  submitted: "Delivered — awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
};

function getAvailableStatuses(d: Deliverable): { value: string; label: string }[] {
  const options = [
    { value: "pending", label: "Not started" },
    { value: "in_production", label: "In progress" },
    { value: "editing", label: "Video editing phase" },
    { value: "submitted", label: "Delivered — awaiting approval" },
  ];

  if (d.status === "revision_requested" || d.previous_status === "revision_requested") {
    options.push({ value: "revision_requested", label: "Revision requested" });
  }

  return options;
}

function getBrandAvailableStatuses(d: Deliverable): { value: string; label: string }[] {
  const options = [
    { value: "in_production", label: "In progress" },
    { value: "submitted", label: "Delivered — awaiting approval" },
    { value: "approved", label: "Approved" },
    { value: "revision_requested", label: "Revision requested" },
    { value: "rejected", label: "Rejected" },
  ];
  if (d.status === "pending") {
    options.unshift({ value: "pending", label: "Not started" });
  }
  if (d.status === "editing") {
    options.splice(2, 0, { value: "editing", label: "Video editing phase" });
  }
  return options;
}

function variantFor(status: string): StatusVariant {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "danger";
    case "revision_requested": return "warning";
    case "submitted": return "accent";
    default: return "neutral";
  }
}

export default function DeliverablesPage() {
  const [items, setItems] = useState<Deliverable[] | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isBrand, setIsBrand] = useState(false);

  function reload() {
    client.GET("/deliverables").then(({ data, error: apiError }) => {
      if (apiError) { setError(true); return; }
      setItems(data ?? []);
    });
  }

  useEffect(() => {
    const brand = loadSession()?.role === "brand";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see AppShell.tsx
    setIsBrand(brand);
    reload();
    client.GET("/deals", { params: { query: { limit: 100 } } }).then(({ data }) => setDeals(data ?? []));
    client.GET("/contracts").then(({ data }) => setContracts(data ?? []));
    if (brand) {
      client.GET("/creators", { params: { query: { limit: 100 } } }).then(({ data }) => setCreators(data ?? []));
    }
  }, []);

  async function createDeliverable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const dealId = String(form.get("deal_id"));
    const contractId = String(form.get("contract_id") || "");
    setBusy(true);
    await client.POST("/deals/{deal_id}/deliverables", {
      params: { path: { deal_id: dealId } },
      body: {
        deal_id: dealId,
        contract_id: contractId || null,
        title: String(form.get("title")),
        description: String(form.get("description")),
      },
    });
    setBusy(false);
    formEl.reset();
    setSelectedDealId("");
    setShowForm(false);
    reload();
  }

  async function handleStatusChange(d: Deliverable, newStatus: string) {
    if (newStatus === d.status) return;
    await client.PATCH("/deliverables/{id}/status", {
      params: { path: { id: d.id }, query: { deal_id: d.deal_id } },
      body: { status: newStatus as any },
    });
    reload();
  }

  if (error) {
    return <EmptyState icon={PackageOpen} message="Couldn't load deliverables. Try signing in again." />;
  }
  if (items === null) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }

  const dealCreatorId = new Map(deals.map((d) => [d.id, d.creator_id]));
  const filteredItems = selectedCreatorId
    ? items.filter((d) => dealCreatorId.get(d.deal_id) === selectedCreatorId)
    : items;

  const content = (
    <>
      {isBrand && (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New deliverable"}
        </button>
      </div>
      )}

      {isBrand && showForm && (
        <form onSubmit={createDeliverable} className="mtile" style={{ marginBottom: "14px", display: "grid", gap: "10px" }}>
          <label className="text-label">Deal
            <select
              name="deal_id" required className="field"
              value={selectedDealId} onChange={(e) => setSelectedDealId(e.target.value)}
            >
              <option value="">Select deal…</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.campaign_name}</option>)}
            </select>
          </label>
          <label className="text-label">Contract (optional — leave blank to add one from your side)
            <select name="contract_id" className="field" disabled={!selectedDealId}>
              <option value="">— Not tied to a contract —</option>
              {contracts.filter((c) => c.deal_id === selectedDealId).map((c) => (
                <option key={c.id} value={c.id}>{c.id.slice(0, 8)} — {c.status}</option>
              ))}
            </select>
          </label>
          <label className="text-label">Title<input name="title" required className="field" /></label>
          <label className="text-label">Description<input name="description" required className="field" /></label>
          <div>
            <button className="btn" disabled={busy} type="submit">Create</button>
          </div>
        </form>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState icon={PackageOpen} message="No deliverables yet. They'll show up here once a deal has content in flight." />
      ) : (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
        <thead>
          <tr style={{ color: "var(--color-ink-faint)", textAlign: "left" }}>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Title</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Description</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Contract</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Status</th>
            <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((d) => {
            const availableStatuses = getAvailableStatuses(d);
            const isCompleted = d.status === "approved" || d.status === "rejected";
            return (
              <tr key={d.id}>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>{d.title}</td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)", color: "var(--color-ink-soft)" }}>{d.description}</td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)", color: "var(--color-ink-soft)" }}>
                  {d.contract_id ? `${d.contract_id.slice(0, 8)}` : "—"}
                </td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                  <StatusPill status={STATUS_LABEL[d.status] ?? d.status} variant={variantFor(d.status)} />
                </td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                  {isBrand ? (
                    <select
                      className="field"
                      style={{
                        display: "inline-block",
                        margin: 0,
                        width: "auto",
                        minWidth: "210px",
                        fontSize: "12.5px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        background: "var(--color-surface-sunken)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-ink)",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 500,
                      }}
                      value={d.status}
                      onChange={(e) => handleStatusChange(d, e.target.value)}
                    >
                      {getBrandAvailableStatuses(d).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : isCompleted ? (
                    <span style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>—</span>
                  ) : (
                    <select
                      className="field"
                      style={{
                        display: "inline-block",
                        margin: 0,
                        width: "auto",
                        minWidth: "210px",
                        fontSize: "12.5px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        background: "var(--color-surface-sunken)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-ink)",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 500,
                      }}
                      value={d.status}
                      onChange={(e) => handleStatusChange(d, e.target.value)}
                    >
                      {availableStatuses.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
    </>
  );

  if (!isBrand) return content;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px" }}>
      <div className="mtile" style={{ padding: "8px", height: "fit-content" }}>
        <div className="lbl" style={{ margin: "4px 6px 8px" }}>Creators</div>
        <button
          onClick={() => setSelectedCreatorId(null)}
          style={{
            display: "block", width: "100%", textAlign: "left", padding: "6px 6px", marginBottom: "4px",
            borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
            background: selectedCreatorId === null ? "var(--color-surface-sunken)" : "transparent",
          }}
        >
          All creators
        </button>
        {creators.map((cr) => {
          const creatorDeals = deals.filter((d) => d.creator_id === cr.id);
          return (
            <button
              key={cr.id}
              onClick={() => setSelectedCreatorId(cr.id)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 6px", marginBottom: "2px",
                borderRadius: "6px", border: "none", cursor: "pointer",
                background: selectedCreatorId === cr.id ? "var(--color-surface-sunken)" : "transparent",
              }}
            >
              <div style={{ fontSize: "12.5px", color: "var(--color-ink)", marginBottom: "4px" }}>{cr.display_name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {creatorDeals.length === 0 ? (
                  <span style={{ fontSize: "10.5px", color: "var(--color-ink-faint)" }}>No deals</span>
                ) : (
                  creatorDeals.map((d) => (
                    <StatusPill key={d.id} status={DEAL_STAGE_LABEL[d.status] ?? d.status} variant={dealStageVariant(d.status)} />
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div>{content}</div>
    </div>
  );
}
