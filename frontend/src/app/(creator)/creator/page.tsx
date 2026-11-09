"use client";

import React, { useEffect, useState } from "react";
import { Handshake, Briefcase } from "lucide-react";
import client from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { GrowthTracker } from "@/components/creator/GrowthTracker";
import { DealsTable } from "@/components/creator/DealsTable";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Deal = components["schemas"]["Deal"];
type Creator = components["schemas"]["Creator"];
type Brand = components["schemas"]["Brand"];
type BenchmarkOut = components["schemas"]["BenchmarkOut"];
type GrowthSnapshot = components["schemas"]["GrowthSnapshot"];
type Contract = components["schemas"]["Contract"];
type DealStats = { completed_count: number; total_earnings: number; earnings_per_project: number };

const CONTRACT_STATUS_OPTIONS = ["unread", "read", "ongoing", "completed"] as const;

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function CreatorDashboard() {
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<Creator | null | undefined>(undefined);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [busy, setBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [linkedBrands, setLinkedBrands] = useState<Brand[]>([]);
  const [linkCode, setLinkCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [unlinkedProject, setUnlinkedProject] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [growthSnapshots, setGrowthSnapshots] = useState<GrowthSnapshot[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkOut | null>(null);

  function reloadGrowthSnapshots() {
    client.GET("/creators/me/growth-snapshots").then(({ data }) => setGrowthSnapshots(data ?? []));
  }

  async function logGrowthSnapshot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    await client.POST("/creators/me/growth-snapshots", {
      body: {
        recorded_at: String(form.get("recorded_at")),
        followers_count: Number(form.get("followers_count")),
        engagement_rate: form.get("engagement_rate") ? Number(form.get("engagement_rate")) : null,
      },
    });
    formEl.reset();
    reloadGrowthSnapshots();
  }

  async function setContractStatus(contractId: string, creator_status: string) {
    const { data } = await client.PATCH("/contracts/{id}/creator-status", {
      params: { path: { id: contractId } },
      body: { creator_status: creator_status as (typeof CONTRACT_STATUS_OPTIONS)[number] },
    });
    if (data) {
      setContracts((prev) => prev.map((c) => (c.id === contractId ? data : c)));
    }
  }

  function reloadBrands() {
    client.GET("/creators/me/brands").then(({ data }) => setLinkedBrands(data ?? []));
  }

  async function linkBrand(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLinkError("");
    setLinkBusy(true);
    const { error: apiError } = await client.POST("/creators/me/link-brand", {
      body: { invite_code: linkCode.trim() },
    });
    setLinkBusy(false);
    if (apiError) { setLinkError("That invite code didn't match a brand."); return; }
    setLinkCode("");
    reloadBrands();
  }

  function reload() {
    const auth = loadSession();
    if (!auth?.creator_id) return;

    client.GET("/creators/{id}", { params: { path: { id: auth.creator_id } } }).then(({ data }) => setProfile(data ?? null));
    client.GET("/deals", { params: { query: { limit: 50 } } }).then(({ data, error: apiError }) => {
      if (apiError) { setError(true); return; }
      setDeals(data ?? []);
    });
    client.GET("/deals/stats").then(({ data }) => setStats((data as DealStats) ?? null));
    client.GET("/contracts", { params: { query: { limit: 100 } } }).then(({ data }) => setContracts(data ?? []));
  }

  useEffect(() => {
    if (!loadSession()?.creator_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see AppShell.tsx
      setError(true);
      return;
    }
    reload();
    reloadBrands();
    reloadGrowthSnapshots();
  }, []);

  useEffect(() => {
    if (!profile) return;
    client.GET("/benchmarks", { params: { query: { niche: profile.niche, follower_tier: profile.follower_tier } } })
      .then(({ data }) => setBenchmark(data ?? null));
  }, [profile]);

  async function completeProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError("");
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error: apiError } = await client.PATCH("/creators/me", {
      body: {
        followers_count: Number(form.get("followers_count")),
        engagement_rate: Number(form.get("engagement_rate")),
        avg_views_per_week: Number(form.get("avg_views_per_week")),
      },
    });
    setBusy(false);
    if (apiError) { setProfileError("Couldn't save your profile. Try again."); return; }
    reload();
  }

  async function addDeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    await client.POST("/deals", {
      body: {
        creator_id: loadSession()?.creator_id ?? "",
        brand_id: unlinkedProject ? null : String(form.get("brand_id")),
        campaign_name: String(form.get("campaign_name")),
        contact_email: unlinkedProject ? "" : String(form.get("contact_email")),
        value_inr: form.get("value_inr") ? Number(form.get("value_inr")) : null,
      },
    });
    setBusy(false);
    formEl.reset();
    setShowDealForm(false);
    reload();
  }

  if (error) {
    return <EmptyState icon={Handshake} message="Couldn't load your dashboard. Try signing in again." />;
  }
  if (profile === undefined) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }

  if (profile && profile.followers_count == null) {
    return (
      <div style={{ maxWidth: "420px" }}>
        <div className="text-h3" style={{ marginBottom: "6px" }}>A couple of numbers first</div>
        <div style={{ fontSize: "13px", color: "var(--color-ink-soft)", marginBottom: "14px" }}>
          We use these to calculate fair rates and track your growth over time.
        </div>
        <form onSubmit={completeProfile} className="mtile" style={{ display: "grid", gap: "10px" }}>
          <label className="text-label">Followers
            <input name="followers_count" type="number" min={0} required className="field" placeholder="e.g. 42000" />
          </label>
          <label className="text-label">Engagement rate (%)
            <input name="engagement_rate" type="number" min={0} step="0.1" required className="field" placeholder="e.g. 4.5" />
          </label>
          <label className="text-label">Avg. views per week
            <input name="avg_views_per_week" type="number" min={0} required className="field" placeholder="e.g. 21000" />
          </label>
          <button className="btn" disabled={busy} type="submit">Continue</button>
          {profileError && <div style={{ fontSize: "12px", color: "var(--color-danger)" }}>{profileError}</div>}
        </form>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "13px", color: "var(--color-ink-soft)" }}>
          {profile
            ? `${profile.followers_count?.toLocaleString()} followers · ${profile.engagement_rate}% engagement${profile.avg_views_per_week ? ` · ${profile.avg_views_per_week.toLocaleString()} views/week` : ""}`
            : ""}
        </div>
        <button className="btn" onClick={() => setShowDealForm((v) => !v)}>
          {showDealForm ? "Cancel" : "+ Add a deal"}
        </button>
      </div>

      <div className="mtile" style={{ marginBottom: "14px" }}>
        <div className="lbl" style={{ marginBottom: "8px" }}>Linked brands</div>
        {linkedBrands.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)", marginBottom: "10px" }}>
            Not linked to any brand yet. Enter an invite code from a brand to see their deals and contracts.
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            {linkedBrands.map((b) => <StatusPill key={b.id} status={b.name} variant="neutral" />)}
          </div>
        )}
        <form onSubmit={linkBrand} style={{ display: "flex", gap: "8px", alignItems: "end" }}>
          <label className="text-label" style={{ flex: 1 }}>Invite code
            <input
              className="field"
              placeholder="Ask your brand contact for this"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              required
            />
          </label>
          <button className="btn" disabled={linkBusy} type="submit">Link brand</button>
        </form>
        {linkError && <div style={{ fontSize: "12px", color: "var(--color-danger)", marginTop: "6px" }}>{linkError}</div>}
      </div>

      {showDealForm && (
        <form onSubmit={addDeal} className="mtile" style={{ marginBottom: "14px", display: "grid", gap: "10px" }}>
          <label className="text-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input type="checkbox" checked={unlinkedProject} onChange={(e) => setUnlinkedProject(e.target.checked)} />
            No brand — this is my own project
          </label>
          {!unlinkedProject && (
            <label className="text-label">Brand
              <select name="brand_id" required={!unlinkedProject} className="field">
                <option value="">Select brand…</option>
                {linkedBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-label">Campaign name<input name="campaign_name" required className="field" /></label>
          {!unlinkedProject && (
            <label className="text-label">Contact email<input name="contact_email" type="email" required className="field" /></label>
          )}
          <label className="text-label">Value (₹, optional)<input name="value_inr" type="number" min={0} className="field" /></label>
          <button className="btn" disabled={busy} type="submit">Add {unlinkedProject ? "project" : "deal"}</button>
        </form>
      )}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          <div className="mtile">
            <div className="lbl">Completed</div>
            <div className="val" style={{ fontSize: "17px" }}>{stats.completed_count}</div>
          </div>
          <div className="mtile">
            <div className="lbl">Total earnings</div>
            <div className="val" style={{ fontSize: "17px" }}>{money(stats.total_earnings)}</div>
          </div>
          <div className="mtile">
            <div className="lbl">Earnings / project</div>
            <div className="val" style={{ fontSize: "17px" }}>{money(stats.earnings_per_project)}</div>
          </div>
        </div>
      )}

      <div className="lbl" style={{ marginBottom: "6px" }}>My deals</div>
      {deals.length === 0 ? (
        <EmptyState icon={Briefcase} message="No deals yet. Add one once a brand reaches out." />
      ) : (
        <div className="mtile" style={{ padding: "4px 10px", marginBottom: "18px" }}>
          <DealsTable deals={deals} />
        </div>
      )}

      <GrowthTracker snapshots={growthSnapshots} onLog={logGrowthSnapshot} />

      <div className="mtile" style={{ marginBottom: "14px" }}>
        <div className="lbl" style={{ marginBottom: "8px" }}>My contracts</div>
        {contracts.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>No contracts uploaded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                    <StatusPill status={c.status} variant={c.status === "signed" ? "success" : "neutral"} />
                  </td>
                  <td style={{ padding: "8px 4px", borderBottom: "1px solid var(--color-border)" }}>
                    <select
                      className="field" style={{ margin: 0 }}
                      value={c.creator_status}
                      onChange={(e) => setContractStatus(c.id, e.target.value)}
                    >
                      {CONTRACT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {profile && (
        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "10px" }}>
            {profile.niche} · {profile.follower_tier} followers
          </div>
          {!benchmark || benchmark.insufficient_data ? (
            <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>Not enough data yet for your niche and tier.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "18px", height: "54px" }}>
              {([["p25", benchmark.p25_rate], ["p50", benchmark.p50_rate], ["p75", benchmark.p75_rate]] as const).map(([label, val], i) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{
                    width: "30px", height: `${20 + i * 17}px`,
                    background: i === 2 ? "var(--color-ink)" : i === 1 ? "var(--color-accent)" : "var(--color-accent-dim)",
                    borderRadius: "4px 4px 0 0",
                  }} />
                  <div style={{ fontSize: "10.5px", color: "var(--color-ink-faint)", marginTop: "4px" }}>{label} {money(val ?? 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
