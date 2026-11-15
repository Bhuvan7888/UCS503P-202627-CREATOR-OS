"use client";

import React, { useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import { errorText } from "@/shared/lib/api-error";
import { PLATFORMS, type Platform } from "@/shared/constants/platforms";
import { useQuery } from "@/shared/lib/query-cache";
import { SettingsHeader } from "@/features/workspaces";
import page from "@/shared/components/shell/page.module.css";
import { AudienceCard } from "./components/AudienceCard";

type Row = { followers: string; engagement: string; views: string };
type Form = Record<Platform, Row>;
const EMPTY_ROW: Row = { followers: "", engagement: "", views: "" };
const emptyForm = () =>
  Object.fromEntries(PLATFORMS.map((p) => [p.value, { ...EMPTY_ROW }])) as Form;
const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Creator Settings → Platform analytics: today's numbers per platform, typed in until the platform APIs are
 * connected. Saving updates Home, what brands see, and AI creator matching. */
export default function PlatformAnalyticsPage() {
  const audience = useQuery(
    "creator:audience",
    async () => (await client.GET("/platform-stats/me")).data,
  );
  const [form, setForm] = useState<Form>(emptyForm);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!audience.data || ready) return; // load the saved values once, never over the user's typing
    const next = emptyForm();
    for (const p of audience.data.platforms) {
      next[p.platform] = {
        followers: String(p.followers_count),
        engagement: p.engagement_rate?.toString() ?? "",
        views: p.avg_views?.toString() ?? "",
      };
    }
    // the form starts from the latest saved numbers
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(next);
    setReady(true);
  }, [audience.data, ready]);

  const set = (platform: Platform, key: keyof Row, value: string) =>
    setForm((f) => ({ ...f, [platform]: { ...f[platform], [key]: value } }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const entries = PLATFORMS.filter((p) => form[p.value].followers.trim() !== "").map((p) => ({
      platform: p.value,
      followers_count: Number(form[p.value].followers),
      engagement_rate: num(form[p.value].engagement),
      avg_views: num(form[p.value].views),
    }));
    if (entries.length === 0) return setError("Enter followers for at least one platform.");
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: apiError } = await client.PUT("/platform-stats/me", { body: { entries } });
    setSaving(false);
    if (!data) return setError(errorText(apiError, "Couldn't update your analytics."));
    audience.mutate(() => data);
    setNotice(
      `Updated for ${today}. Your Home, brands and AI creator matching now use these numbers.`,
    );
  }

  return (
    <>
      <SettingsHeader tab="Platform analytics" />
      <div className={page.stack}>
        <section className={page.card}>
          <h2>Update your analytics</h2>
          <p className={page.cardSub}>
            Until Instagram and other platforms are connected, enter your current numbers here —
            check each app&apos;s insights. Saving records them for today ({today}); updating again
            today replaces today&apos;s numbers. Leave a platform empty if you don&apos;t use it.
          </p>
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
          <form onSubmit={save}>
            <fieldset className={page.fieldset} disabled={!ready}>
              <div className={page.tableWrap}>
                <table className={page.table}>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Followers</th>
                      <th>Engagement %</th>
                      <th>Avg. weekly views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORMS.map((p) => (
                      <tr key={p.value}>
                        <td>{p.label}</td>
                        <td>
                          <input
                            className="field"
                            type="number"
                            min={0}
                            aria-label={`${p.label} followers`}
                            value={form[p.value].followers}
                            onChange={(e) => set(p.value, "followers", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="field"
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            aria-label={`${p.label} engagement rate`}
                            value={form[p.value].engagement}
                            onChange={(e) => set(p.value, "engagement", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="field"
                            type="number"
                            min={0}
                            aria-label={`${p.label} weekly views`}
                            value={form[p.value].views}
                            onChange={(e) => set(p.value, "views", e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={page.inlineForm}>
                <button className="btn" type="submit" disabled={saving || !audience.data}>
                  {saving ? "Saving…" : `Update analytics for today`}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
        <AudienceCard
          audience={audience.data}
          title="What brands see"
          subtitle="Latest numbers per platform, marked self-reported"
          emptyText="Nothing saved yet."
        />
      </div>
    </>
  );
}
