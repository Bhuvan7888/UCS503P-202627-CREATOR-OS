"use client";

import React, { useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import { errorText } from "@/shared/lib/api-error";
import { useQuery } from "@/shared/lib/query-cache";
import page from "@/shared/components/shell/page.module.css";

const TIERS = [
  { value: "nano", label: "Nano (1K – 10K)" },
  { value: "micro", label: "Micro (10K – 50K)" },
  { value: "mid", label: "Mid (50K – 200K)" },
  { value: "macro", label: "Macro (200K – 1M)" },
  { value: "mega", label: "Mega (1M+)" },
] as const;
type Tier = (typeof TIERS)[number]["value"];

interface Form {
  instagram_handle: string;
  niche: string;
  follower_tier: Tier | "";
  followers_count: string;
  engagement_rate: string;
  avg_views_per_week: string;
}
const EMPTY: Form = {
  instagram_handle: "",
  niche: "",
  follower_tier: "",
  followers_count: "",
  engagement_rate: "",
  avg_views_per_week: "",
};
const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Creator Settings → Brands: the numbers brands (and AI creator matching) see, kept up to date. */
export function CreatorStatsCard() {
  const me = useQuery("creator:me", async () => (await client.GET("/creators/me")).data);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const c = me.data;
    if (!c) return;
    const tier = TIERS.some((t) => t.value === c.follower_tier) ? (c.follower_tier as Tier) : "";
    // the form starts from the saved stats once they arrive
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      instagram_handle: c.instagram_handle,
      niche: c.niche === "General" ? "" : c.niche,
      follower_tier: tier,
      followers_count: c.followers_count?.toString() ?? "",
      engagement_rate: c.engagement_rate?.toString() ?? "",
      avg_views_per_week: c.avg_views_per_week?.toString() ?? "",
    });
  }, [me.data]);

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.follower_tier) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: apiError } = await client.PATCH("/creators/me", {
      body: {
        instagram_handle: form.instagram_handle,
        niche: form.niche,
        follower_tier: form.follower_tier,
        followers_count: Number(form.followers_count),
        engagement_rate: num(form.engagement_rate),
        avg_views_per_week: num(form.avg_views_per_week),
      },
    });
    setSaving(false);
    if (!data) return setError(errorText(apiError, "Couldn't save your stats."));
    me.mutate(() => data);
    setNotice("Saved — brands now see these numbers, marked as updated today.");
  }

  const updated = me.data && (me.data.stats_updated_at ?? me.data.created_at);
  return (
    <section className={page.card}>
      <h2>Your creator stats</h2>
      <p className={page.cardSub}>
        What brands see about you, and what AI creator matching uses. Keep them current — brands see
        when you last updated them, and matches on old numbers are marked low confidence.
        {updated && ` Last updated ${new Date(updated).toLocaleDateString()}.`}
      </p>
      {me.error && !me.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load your stats. Try refreshing.
        </p>
      )}
      {error && (
        <p className={page.errorBox} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={page.notice} role="status">
          {notice}
        </p>
      )}
      <form className={page.form} onSubmit={save}>
        <label>
          Instagram handle
          <input
            className="field"
            required
            maxLength={60}
            placeholder="@yourhandle"
            value={form.instagram_handle}
            onChange={(e) => set("instagram_handle", e.target.value)}
          />
        </label>
        <label>
          Niche
          <input
            className="field"
            required
            maxLength={60}
            placeholder="beauty, tech, fitness…"
            value={form.niche}
            onChange={(e) => set("niche", e.target.value)}
          />
        </label>
        <label>
          Follower tier
          <select
            className="field"
            required
            value={form.follower_tier}
            onChange={(e) => set("follower_tier", e.target.value)}
          >
            <option value="" disabled>
              Select a tier…
            </option>
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Followers
          <input
            className="field"
            type="number"
            required
            min={0}
            value={form.followers_count}
            onChange={(e) => set("followers_count", e.target.value)}
          />
        </label>
        <label>
          Engagement rate % (optional)
          <input
            className="field"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={form.engagement_rate}
            onChange={(e) => set("engagement_rate", e.target.value)}
          />
        </label>
        <label>
          Avg. views per week (optional)
          <input
            className="field"
            type="number"
            min={0}
            value={form.avg_views_per_week}
            onChange={(e) => set("avg_views_per_week", e.target.value)}
          />
        </label>
        <div className={page.full}>
          <button className="btn" type="submit" disabled={saving || !me.data}>
            {saving ? "Saving…" : "Save stats"}
          </button>
        </div>
      </form>
    </section>
  );
}
