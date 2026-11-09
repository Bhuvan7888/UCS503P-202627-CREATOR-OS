"use client";

import React, { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { Users2 } from "lucide-react";
import client from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Creator = components["schemas"]["Creator"];
type Deal = components["schemas"]["Deal"];
type Payment = components["schemas"]["Payment"];
type Contract = components["schemas"]["Contract"];
type Message = components["schemas"]["Message"];

const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead", negotiating: "Negotiating", contracted: "Contracted",
  in_production: "In production", completed: "Completed", cancelled: "Cancelled",
};

const POLL_MS = 4000;

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [creator, setCreator] = useState<Creator | null | undefined>(undefined);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState(false);
  const [uploadDealId, setUploadDealId] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function reload() {
    Promise.all([
      client.GET("/creators/{id}", { params: { path: { id } } }),
      client.GET("/deals", { params: { query: { limit: 200 } } }),
      client.GET("/contracts"),
      client.GET("/payments", { params: { query: { limit: 200 } } }),
    ]).then(([creatorRes, dealsRes, contractsRes, paymentsRes]) => {
      if (creatorRes.error || dealsRes.error) { setError(true); return; }
      setCreator(creatorRes.data ?? null);
      const myDeals = (dealsRes.data ?? []).filter((d) => d.creator_id === id);
      setDeals(myDeals);
      const myDealIds = new Set(myDeals.map((d) => d.id));
      const myContracts = (contractsRes.data ?? []).filter((c) => myDealIds.has(c.deal_id ?? ""));
      setContracts(myContracts);
      const myContractIds = new Set(myContracts.map((c) => c.id));
      setPayments((paymentsRes.data ?? []).filter((p) => myContractIds.has(p.contract_id)));
    });
  }

  useEffect(() => { reload(); }, [id]);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      client.GET("/messages", { params: { query: { with_id: id } } }).then(({ data }) => {
        if (!cancelled) setMessages(data ?? []);
      });
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function uploadContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file || !uploadDealId) return;
    setUploadBusy(true);
    const body = new FormData();
    body.append("file", file);
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/deals/${uploadDealId}/contracts`,
      { method: "POST", headers: { Authorization: `Bearer ${loadSession()?.access_token ?? ""}` }, body }
    );
    setUploadBusy(false);
    formEl.reset();
    reload();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSendBusy(true);
    setSendError("");
    const { data, error: apiError } = await client.POST("/messages", {
      params: { query: { with_id: id } },
      body: { body: draft },
    });
    setSendBusy(false);
    if (apiError || !data) {
      setSendError("Couldn't send that — try again.");
      return;
    }
    setMessages((prev) => [...prev, data]);
    setDraft("");
  }

  if (error) return <EmptyState icon={Users2} message="Couldn't load this creator." />;
  if (creator === undefined) return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  if (!creator) return <EmptyState icon={Users2} message="Creator not found." />;

  const active = deals.filter((d) => !["completed", "cancelled"].includes(d.status)).length;
  const completed = deals.filter((d) => d.status === "completed").length;
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount_inr), 0);
  const totalPending = payments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + Number(p.amount_inr), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <Link href="/brand" style={{ fontSize: "12px", color: "var(--color-ink-soft)" }}>← Back to deals</Link>
        <h1 className="text-h2" style={{ margin: "6px 0 2px" }}>{creator.display_name}</h1>
        <div style={{ fontSize: "12.5px", color: "var(--color-ink-soft)" }}>
          {creator.instagram_handle} · {creator.niche} · {creator.follower_tier}
          {creator.followers_count != null && <> · {creator.followers_count.toLocaleString()} followers</>}
          {creator.engagement_rate != null && <> · {creator.engagement_rate}% engagement</>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <div className="mtile"><div className="lbl">Deals</div><div className="val">{deals.length}</div></div>
        <div className="mtile"><div className="lbl">Active</div><div className="val">{active}</div></div>
        <div className="mtile"><div className="lbl">Completed</div><div className="val">{completed}</div></div>
        <div className="mtile"><div className="lbl">Paid to date</div><div className="val" style={{ fontSize: "16px" }}>{money(totalPaid)}</div></div>
        <div className="mtile"><div className="lbl">Outstanding</div><div className="val" style={{ fontSize: "16px" }}>{money(totalPending)}</div></div>
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Chat</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto", marginBottom: "10px" }}>
          {messages.length === 0 && (
            <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No messages yet.</div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender_type === "brand" ? "flex-end" : "flex-start", maxWidth: "70%", fontSize: "12.5px",
                background: m.sender_type === "brand" ? "var(--color-ink)" : "var(--color-surface-sunken)",
                color: m.sender_type === "brand" ? "var(--color-surface)" : "var(--color-ink)",
                borderRadius: m.sender_type === "brand" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                padding: "8px 10px",
              }}
            >
              {m.body}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={sendMessage} style={{ display: "flex", gap: "8px" }}>
          <input className="field" style={{ flex: 1, margin: 0 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" />
          <button className="btn" disabled={sendBusy || !draft.trim()} type="submit">Send</button>
        </form>
        {sendError && <div style={{ fontSize: "11.5px", color: "var(--color-danger)", marginTop: "6px" }}>{sendError}</div>}
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Deals</div>
        {deals.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No deals yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>{d.campaign_name}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>
                    <StatusPill status={DEAL_STAGE_LABEL[d.status] ?? d.status} variant="accent" />
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>
                    <Link href={`/deals/${d.id}`} style={{ color: "var(--color-accent)" }}>Open →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Contracts</div>
        {contracts.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)", marginBottom: "10px" }}>No contracts uploaded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", marginBottom: "10px" }}>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>
                    <StatusPill status={c.status} variant={c.status === "signed" ? "success" : "neutral"} />
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)", color: "var(--color-ink-soft)" }}>
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {deals.length > 0 && (
          <form onSubmit={uploadContract} style={{ display: "flex", gap: "8px", alignItems: "end" }}>
            <label className="text-label" style={{ margin: 0 }}>Deal
              <select className="field" style={{ margin: 0 }} value={uploadDealId} onChange={(e) => setUploadDealId(e.target.value)} required>
                <option value="">Select deal…</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.campaign_name}</option>)}
              </select>
            </label>
            <input type="file" name="file" accept="application/pdf" required />
            <button className="btn" disabled={uploadBusy || !uploadDealId} type="submit">Upload</button>
          </form>
        )}
      </div>

      <div className="mtile">
        <div className="lbl" style={{ marginBottom: "8px" }}>Payment history</div>
        {payments.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No invoices yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>{p.invoice_number}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>{money(Number(p.amount_inr))}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>
                    <StatusPill status={p.status} variant={p.status === "paid" ? "success" : "warning"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
