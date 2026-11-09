"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import client from "@/lib/api";
import { StatusPill, StatusVariant } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Deal = components["schemas"]["Deal"];
type Creator = components["schemas"]["Creator"];

const FOLLOWER_TIERS = [
  { value: "nano", label: "Nano (1K – 10K followers)" },
  { value: "micro", label: "Micro (10K – 50K followers)" },
  { value: "mid", label: "Mid (50K – 200K followers)" },
  { value: "macro", label: "Macro (200K – 1M followers)" },
  { value: "mega", label: "Mega (1M+ followers)" },
];

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  negotiating: "Negotiating",
  contracted: "Contracted",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};

function variantFor(status: string): StatusVariant {
  switch (status) {
    case "negotiating": return "warning";
    case "contracted": return "success";
    case "completed": return "success";
    case "cancelled": return "danger";
    default: return "neutral";
  }
}

export default function BrandDashboard() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [error, setError] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [showCreatorForm, setShowCreatorForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [onboardedName, setOnboardedName] = useState("");

  function reload() {
    Promise.all([
      client.GET("/deals", { params: { query: { limit: 100 } } }),
      client.GET("/creators", { params: { query: { limit: 100 } } }),
    ]).then(([dealsRes, creatorsRes]) => {
      if (dealsRes.error) { setError(true); return; }
      setDeals(dealsRes.data ?? []);
      setCreators(creatorsRes.data ?? []);
    });
  }

  useEffect(() => {
    const session = loadSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see AppShell.tsx
    setBrandName(session?.brand_name ?? "");
    setInviteCode(session?.brand_id ?? "");
    reload();
  }, []);

  async function onboardCreator(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setFormError("");
    setOnboardedName("");
    setBusy(true);
    const form = new FormData(formEl);
    const followersRaw = String(form.get("followers_count") || "");
    const engagementRaw = String(form.get("engagement_rate") || "");
    const viewsRaw = String(form.get("avg_views_per_week") || "");
    const displayName = String(form.get("display_name"));
    const { error: apiError } = await client.POST("/creators", {
      body: {
        display_name: displayName,
        instagram_handle: String(form.get("instagram_handle")),
        niche: String(form.get("niche")),
        follower_tier: String(form.get("follower_tier")),
        followers_count: followersRaw ? Number(followersRaw) : null,
        engagement_rate: engagementRaw ? Number(engagementRaw) : null,
        avg_views_per_week: viewsRaw ? Number(viewsRaw) : null,
      },
    });
    setBusy(false);
    if (apiError) { setFormError("Couldn't onboard creator."); return; }
    formEl.reset();
    setShowCreatorForm(false);
    setOnboardedName(displayName);
    reload();
  }

  async function createDeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setFormError("");
    setBusy(true);
    const form = new FormData(formEl);
    const { error: apiError } = await client.POST("/deals", {
      body: {
        creator_id: String(form.get("creator_id")),
        campaign_name: String(form.get("campaign_name")),
        contact_email: String(form.get("contact_email")),
      },
    });
    setBusy(false);
    if (apiError) { setFormError("Couldn't create deal."); return; }
    formEl.reset();
    setShowDealForm(false);
    reload();
  }

  if (error) {
    return <EmptyState icon={Briefcase} message="Couldn't load your deals. Try signing in again." />;
  }
  if (deals === null) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }

  const creatorName = (id: string) => creators.find((c) => c.id === id)?.display_name ?? "—";
  const active = deals.filter((d) => !["completed", "cancelled"].includes(d.status)).length;
  const completed = deals.filter((d) => d.status === "completed").length;

  return (
    <>
      <div style={{ fontSize: "13px", color: "var(--color-ink-soft)", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div>{brandName ? `Welcome back, ${brandName}` : "Welcome back"}</div>
          <div style={{ fontSize: "12px", color: "var(--color-ink-soft)", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Invite code for creators to self-sign-up:</span>
            <code style={{ background: "var(--color-surface-sunken)", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{inviteCode}</code>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "3px 8px", fontSize: "11px" }}
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
            >
              {codeCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-ghost" onClick={() => setShowCreatorForm((v) => !v)}>
            {showCreatorForm ? "Cancel" : "+ Onboard creator"}
          </button>
          <button className="btn" onClick={() => setShowDealForm((v) => !v)}>
            {showDealForm ? "Cancel" : "+ New deal"}
          </button>
        </div>
      </div>

      {showCreatorForm && (
        <form onSubmit={onboardCreator} className="mtile" style={{ marginBottom: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label className="text-label">Display name<input name="display_name" required className="field" /></label>
          <label className="text-label">Instagram handle<input name="instagram_handle" required placeholder="@handle" className="field" /></label>
          <label className="text-label">Niche<input name="niche" required placeholder="beauty, tech, fitness…" className="field" /></label>
          <label className="text-label">Follower tier
            <select name="follower_tier" required className="field" defaultValue="">
              <option value="" disabled>Select a tier…</option>
              {FOLLOWER_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="text-label">Follower count (optional)
            <input name="followers_count" type="number" min={0} placeholder="e.g. 42000" className="field" />
          </label>
          <label className="text-label">Engagement rate % (optional)
            <input name="engagement_rate" type="number" min={0} step="0.1" placeholder="e.g. 4.5" className="field" />
          </label>
          <label className="text-label" style={{ gridColumn: "1 / -1" }}>Avg. views per week (optional)
            <input name="avg_views_per_week" type="number" min={0} placeholder="e.g. 21000" className="field" />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn" disabled={busy} type="submit">Onboard</button>
          </div>
        </form>
      )}

      {onboardedName && (
        <div className="mtile" style={{ marginBottom: "14px", fontSize: "12.5px" }}>
          ✓ {onboardedName} onboarded. They can get their own login by signing up at{" "}
          <Link href="/creator/signup" style={{ color: "var(--color-accent)" }}>/creator/signup</Link> with your
          brand&apos;s invite code: <strong>{inviteCode}</strong>
        </div>
      )}

      {showDealForm && (
        <form onSubmit={createDeal} className="mtile" style={{ marginBottom: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label className="text-label">Creator
            <select name="creator_id" required className="field">
              <option value="">Select creator…</option>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
          </label>
          <label className="text-label">Campaign name<input name="campaign_name" required className="field" /></label>
          <label className="text-label" style={{ gridColumn: "1 / -1" }}>Contact email<input name="contact_email" type="email" required className="field" /></label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn" disabled={busy} type="submit">Create deal</button>
          </div>
        </form>
      )}

      {formError && <div style={{ fontSize: "12px", color: "var(--color-danger)", marginBottom: "10px" }}>{formError}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <div className="mtile">
          <div className="lbl">Total deals</div>
          <div className="val">{deals.length}</div>
        </div>
        <div className="mtile">
          <div className="lbl">Active</div>
          <div className="val">{active}</div>
        </div>
        <div className="mtile">
          <div className="lbl">Completed</div>
          <div className="val">{completed}</div>
        </div>
      </div>

      {deals.length === 0 ? (
        <EmptyState icon={Briefcase} message="No deals yet. Onboard a creator and open your first deal to get started." />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
          <thead>
            <tr style={{ color: "var(--color-ink-faint)", textAlign: "left" }}>
              <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Creator</th>
              <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Campaign</th>
              <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}>Stage</th>
              <th style={{ fontWeight: 600, padding: "6px 4px", borderBottom: "1px solid var(--color-border)" }}></th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                  <Link href={`/creators/${d.creator_id}`} style={{ color: "var(--color-accent)" }}>{creatorName(d.creator_id)}</Link>
                </td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>{d.campaign_name}</td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                  <StatusPill status={STAGE_LABEL[d.status] ?? d.status} variant={variantFor(d.status)} />
                  {!d.brand_viewed_at && (
                    <span style={{ marginLeft: "6px" }}>
                      <StatusPill status="Unread" variant="warning" />
                    </span>
                  )}
                </td>
                <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                  <Link href={`/deals/${d.id}`} style={{ color: "var(--color-accent)" }}>Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
