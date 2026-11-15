"use client";

import React, { useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import { useQuery } from "@/shared/lib/query-cache";
import page from "@/shared/components/shell/page.module.css";
import { BrandSettingsHeader } from "./components/BrandSettingsHeader";

const FIELDS = [
  {
    key: "products",
    label: "Products",
    hint: "What you sell — hero products, price points, what's launching",
  },
  {
    key: "audience",
    label: "Target audience",
    hint: "Who you want to reach: age, interests, region",
  },
  {
    key: "voice",
    label: "Brand voice",
    hint: "How you sound: e.g. warm, playful, expert, minimal",
  },
  {
    key: "goals",
    label: "Campaign goals",
    hint: "What campaigns should achieve: awareness, sales, app installs…",
  },
  {
    key: "guidelines",
    label: "Do's and don'ts",
    hint: "Claims to avoid, competitors not to mention, mandatory disclosures",
  },
] as const;
type Form = Record<(typeof FIELDS)[number]["key"], string>;
const EMPTY: Form = { products: "", audience: "", voice: "", goals: "", guidelines: "" };

/** Brand Settings → AI knowledge: what the AI brief writer, creator matching and reply drafts know. */
export default function BrandAiKnowledgePage() {
  const profile = useQuery(
    "brand:ai-profile",
    async () => (await client.GET("/brand-ai/profile")).data,
  );
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    const p = profile.data;
    // the form starts from the saved knowledge once it arrives
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      products: p.products ?? "",
      audience: p.audience ?? "",
      voice: p.voice ?? "",
      goals: p.goals ?? "",
      guidelines: p.guidelines ?? "",
    });
  }, [profile.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: apiError } = await client.PUT("/brand-ai/profile", { body: form });
    setSaving(false);
    if (apiError || !data) return setError("Couldn't save the AI knowledge.");
    profile.mutate(() => data);
    setNotice("Saved — the AI features now use this.");
  }

  return (
    <>
      <BrandSettingsHeader tab="AI knowledge" />
      <section className={page.card}>
        <h2>What the AI knows about your brand</h2>
        <p className={page.cardSub}>
          Used by the AI campaign brief (on each deal), AI creator matching (Creators) and AI reply
          drafts (Chat). The more specific, the better the results.
        </p>
        {profile.error && !profile.data && (
          <p className={page.errorBox} role="alert">
            Couldn&apos;t load your AI knowledge. Try refreshing.
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
          {FIELDS.map((f) => (
            <label key={f.key} className={page.full}>
              {f.label}
              <textarea
                className="field"
                rows={3}
                maxLength={4000}
                placeholder={f.hint}
                value={form[f.key]}
                onChange={(e) => setForm((cur) => ({ ...cur, [f.key]: e.target.value }))}
              />
            </label>
          ))}
          <div className={page.full}>
            <button className="btn" type="submit" disabled={saving || !profile.data}>
              {saving ? "Saving…" : "Save AI knowledge"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
