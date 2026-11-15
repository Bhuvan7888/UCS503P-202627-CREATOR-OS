"use client";

import React, { useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import { useQuery } from "@/shared/lib/query-cache";
import { loadSession, saveSession } from "@/shared/lib/session";
import page from "@/shared/components/shell/page.module.css";
import { BrandSettingsHeader } from "./components/BrandSettingsHeader";

const FIELDS = ["name", "description", "industry", "website", "gst_number", "pan_number"] as const;
type Form = Record<(typeof FIELDS)[number], string>;
const EMPTY: Form = Object.fromEntries(FIELDS.map((f) => [f, ""])) as Form;

/** Brand Settings → Brand profile: who the brand is (also what creators and the AI see). */
export default function BrandProfilePage() {
  const brand = useQuery("brand:me", async () => (await client.GET("/brands/me")).data);
  const [form, setForm] = useState<Form>(EMPTY);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!brand.data || ready) return; // load the saved values once, never over the user's typing
    // the form starts from the saved profile once it arrives
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(Object.fromEntries(FIELDS.map((f) => [f, brand.data?.[f] ?? ""])) as Form);
    setReady(true);
  }, [brand.data, ready]);

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: apiError } = await client.PATCH("/brands/me", {
      body: {
        ...form,
        gst_number: form.gst_number.toUpperCase(),
        pan_number: form.pan_number.toUpperCase(),
      },
    });
    setSaving(false);
    if (apiError || !data) {
      return setError(
        "Couldn't save — check the GST (15 characters) and PAN (e.g. ABCDE1234F) format.",
      );
    }
    brand.mutate(() => data);
    const session = loadSession();
    if (session && session.brand_name !== data.name) {
      saveSession({ ...session, brand_name: data.name });
      window.dispatchEvent(new Event("sessionUpdated")); // the sidebar shows the new name
    }
    setNotice("Brand profile saved.");
  }

  return (
    <>
      <BrandSettingsHeader tab="Brand profile" />
      <section className={page.card}>
        <h2>Brand profile</h2>
        <p className={page.cardSub}>
          Shown to creators you work with and used by the AI features. Tax details appear on your
          records only.
        </p>
        {brand.error && !brand.data && (
          <p className={page.errorBox} role="alert">
            Couldn&apos;t load your brand profile. Try refreshing.
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
          <fieldset className={page.fieldset} disabled={!ready}>
            <label>
              Brand name
              <input
                className="field"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              Industry
              <input
                className="field"
                maxLength={120}
                placeholder="e.g. Beauty & personal care"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
              />
            </label>
            <label className={page.full}>
              About the brand
              <textarea
                className="field"
                rows={4}
                maxLength={2000}
                placeholder="What you sell, who you're for, what makes you different"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            <label className={page.full}>
              Website
              <input
                className="field"
                type="url"
                maxLength={300}
                placeholder="https://"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </label>
            <label>
              GST number (optional)
              <input
                className="field"
                maxLength={15}
                placeholder="27ABCDE1234F1Z5"
                value={form.gst_number}
                onChange={(e) => set("gst_number", e.target.value)}
              />
            </label>
            <label>
              PAN (optional)
              <input
                className="field"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={form.pan_number}
                onChange={(e) => set("pan_number", e.target.value)}
              />
            </label>
            <div className={page.full}>
              <button className="btn" type="submit" disabled={saving || !brand.data}>
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </>
  );
}
