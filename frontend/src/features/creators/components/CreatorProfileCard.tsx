"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import client from "@/shared/lib/api-client";
import { errorText } from "@/shared/lib/api-error";
import { useQuery } from "@/shared/lib/query-cache";
import page from "@/shared/components/shell/page.module.css";

/** Creator Settings → Brands: the handle and niche brands see. Numbers live in Platform analytics. */
export function CreatorProfileCard({ analyticsHref }: { analyticsHref: string }) {
  const me = useQuery("creator:me", async () => (await client.GET("/creators/me")).data);
  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!me.data || ready) return; // load the saved values once, never over the user's typing
    /* eslint-disable react-hooks/set-state-in-effect -- the form starts from the saved profile */
    setHandle(me.data.instagram_handle);
    setNiche(me.data.niche === "General" ? "" : me.data.niche);
    /* eslint-enable react-hooks/set-state-in-effect */
    setReady(true);
  }, [me.data, ready]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: apiError } = await client.PATCH("/creators/me", {
      body: { instagram_handle: handle, niche },
    });
    setSaving(false);
    if (!data) return setError(errorText(apiError, "Couldn't save your profile."));
    me.mutate(() => data);
    setNotice("Saved — brands now see this.");
  }

  const c = me.data;
  return (
    <section className={page.card}>
      <h2>Your creator profile</h2>
      <p className={page.cardSub}>
        What brands see about you. Your follower numbers, engagement and views come from{" "}
        <Link href={analyticsHref}>Platform analytics</Link> — keep them current there.
        {c?.followers_count != null &&
          ` Now: ${c.followers_count.toLocaleString()} followers (${c.follower_tier})${
            c.engagement_rate != null ? `, ${c.engagement_rate}% engagement` : ""
          }.`}
      </p>
      {me.error && !me.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load your profile. Try refreshing.
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
            Instagram handle
            <input
              className="field"
              required
              maxLength={60}
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </label>
          <label>
            Niche
            <input
              className="field"
              required
              maxLength={60}
              placeholder="beauty, tech, fitness…"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </label>
          <div className={page.full}>
            <button className="btn" type="submit" disabled={saving || !me.data}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
