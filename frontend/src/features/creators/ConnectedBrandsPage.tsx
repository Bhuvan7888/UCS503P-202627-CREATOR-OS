"use client";

import React, { useState } from "react";
import Link from "next/link";
import client from "@/shared/lib/api-client";
import { useQuery } from "@/shared/lib/query-cache";
import { SettingsHeader, useWorkspace } from "@/features/workspaces";
import page from "@/shared/components/shell/page.module.css";

/** Creator Settings → Brands: connect to a brand with its invite code and see the brands you're connected to. */
export default function ConnectedBrandsPage() {
  const { base } = useWorkspace();
  const brands = useQuery(
    "creator:brands",
    async () => (await client.GET("/creators/me/brands")).data,
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: apiError } = await client.POST("/creators/me/link-brand", {
      body: { invite_code: code.trim() },
    });
    setBusy(false);
    if (apiError || !data) {
      return setError(
        typeof apiError?.detail === "string" ? apiError.detail : "Couldn't connect to that brand.",
      );
    }
    setCode("");
    setNotice(`Connected to ${data.name}. Their deals now appear in your Brand CRM.`);
    brands.refresh();
  }

  return (
    <>
      <SettingsHeader tab="Brands" />
      <div className={page.stack}>
        <section className={page.card}>
          <h2>Connect a brand</h2>
          <p className={page.cardSub}>
            Enter the invite code a brand shared with you. Once connected you can chat with them in
            Messages, and the deals they create with you show up in your Brand CRM.
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
          <form className={page.inlineForm} onSubmit={connect}>
            <label>
              Invite code
              <input
                className="field"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 98aaedcc-c151-41fe-8806-574bcf82158a"
                required
                maxLength={64}
              />
            </label>
            <button className="btn" type="submit" disabled={busy || !code.trim()}>
              {busy ? "Connecting…" : "Connect"}
            </button>
          </form>
        </section>

        <section className={page.card}>
          <h2>Connected brands</h2>
          <p className={page.cardSub}>Brands you work with on Creator OS</p>
          {brands.data?.length ? (
            <ul className={page.list}>
              {brands.data.map((b) => (
                <li key={b.id}>
                  <span className={page.grow}>
                    {b.name}
                    {b.description && <small>{b.description}</small>}
                  </span>
                  <Link href={`${base}/messages`} className="btn btn-text">
                    Message
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={page.muted}>
              {brands.data ? "No brands yet." : brands.error ? "Couldn't load brands." : "Loading…"}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
