"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, UserPlus, Users } from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { Dialog } from "@/shared/components/ui/Dialog";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { useCreators, useDeals } from "@/shared/lib/brand-queries";
import { loadSession } from "@/shared/lib/session";
import page from "@/shared/components/shell/page.module.css";

const FOLLOWER_TIERS = [
  { value: "nano", label: "Nano (1K – 10K followers)" },
  { value: "micro", label: "Micro (10K – 50K followers)" },
  { value: "mid", label: "Mid (50K – 200K followers)" },
  { value: "macro", label: "Macro (200K – 1M followers)" },
  { value: "mega", label: "Mega (1M+ followers)" },
];

const optionalNumber = (v: FormDataEntryValue | null) => (v ? Number(v) : null);

/** Brand: the creator roster — creators who connected with the invite code and creators the brand added. */
export default function CreatorsPage() {
  const creators = useCreators();
  const deals = useDeals().data;
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage and the URL are client-only */
    setInviteCode(loadSession()?.brand_id ?? "");
    // ⌘K "Onboard creator" links here with ?new=1
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function onboard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setFormError(null);
    const { data, error } = await client.POST("/creators", {
      body: {
        display_name: String(form.get("display_name")).trim(),
        instagram_handle: String(form.get("instagram_handle")).trim(),
        niche: String(form.get("niche")).trim(),
        follower_tier: String(form.get("follower_tier")),
        followers_count: optionalNumber(form.get("followers_count")),
        engagement_rate: optionalNumber(form.get("engagement_rate")),
        avg_views_per_week: optionalNumber(form.get("avg_views_per_week")),
      },
    });
    setBusy(false);
    if (error || !data) return setFormError("Couldn't add the creator.");
    creators.mutate((list) => [data, ...(list ?? [])]);
    setOpen(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const dealCount = (id: string) => (deals ?? []).filter((d) => d.creator_id === id).length;
  const list = creators.data ?? [];

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Users}
        title="Creators"
        subtitle="The creators you work with"
        actions={
          <button type="button" className="btn btn-row" onClick={() => setOpen(true)}>
            <UserPlus size={14} /> Onboard creator
          </button>
        }
      />

      <section className={`${page.card} ${page.spaced}`}>
        <h2>Invite code</h2>
        <p className={page.cardSub}>
          Creators on Creator OS connect with you by entering this code in their workspace under
          Settings → Brands. Connected creators can chat with you and see your deals in their CRM.
        </p>
        <div className={page.row}>
          <code className={page.code}>{inviteCode || "—"}</code>
          <button type="button" className="btn btn-outline btn-row" onClick={copyCode}>
            <Copy size={14} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      {creators.error && !creators.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load your creators. Try refreshing.
        </p>
      )}
      <div className={page.tableWrap}>
        <table className={page.table}>
          <thead>
            <tr>
              <th>Creator</th>
              <th>Niche</th>
              <th>Followers</th>
              <th>Engagement</th>
              <th>Deals</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className={page.grow}>
                    <Link href={`/creators/${c.id}`}>{c.display_name}</Link>
                    <small>@{c.instagram_handle.replace(/^@/, "")}</small>
                  </span>
                </td>
                <td>
                  {c.niche} · {c.follower_tier}
                </td>
                <td>{c.followers_count?.toLocaleString() ?? "—"}</td>
                <td>{c.engagement_rate != null ? `${c.engagement_rate}%` : "—"}</td>
                <td>{dealCount(c.id)}</td>
                <td>
                  {c.user_id ? (
                    <StatusPill status="On Creator OS" variant="success" />
                  ) : (
                    <StatusPill status="Added by you" variant="neutral" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className={page.empty}>
            {creators.data
              ? "No creators yet — share your invite code or onboard one."
              : "Loading…"}
          </p>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Onboard creator" width={600}>
        <form className={page.form} onSubmit={onboard}>
          <label>
            Display name
            <input name="display_name" required maxLength={120} className="field" />
          </label>
          <label>
            Instagram handle
            <input
              name="instagram_handle"
              required
              maxLength={60}
              placeholder="@handle"
              className="field"
            />
          </label>
          <label>
            Niche
            <input
              name="niche"
              required
              maxLength={60}
              placeholder="beauty, tech, fitness…"
              className="field"
            />
          </label>
          <label>
            Follower tier
            <select name="follower_tier" required className="field" defaultValue="">
              <option value="" disabled>
                Select a tier…
              </option>
              {FOLLOWER_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Followers (optional)
            <input name="followers_count" type="number" min={0} className="field" />
          </label>
          <label>
            Engagement rate % (optional)
            <input name="engagement_rate" type="number" min={0} step="0.1" className="field" />
          </label>
          <label className={page.full}>
            Avg. views per week (optional)
            <input name="avg_views_per_week" type="number" min={0} className="field" />
          </label>
          {formError && <p className={`${page.errorBox} ${page.full}`}>{formError}</p>}
          <div className={page.full}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Adding…" : "Onboard creator"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
