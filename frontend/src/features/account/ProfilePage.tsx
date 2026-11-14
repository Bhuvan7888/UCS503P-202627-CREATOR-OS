"use client";

import React, { useEffect, useMemo, useState } from "react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { SettingsHeader } from "@/features/workspaces";
import styles from "./account.module.css";

type Profile = components["schemas"]["Profile"];
const BIO_MAX = 500;

/** Settings › Profile: the signed-in person (shared across all their workspaces). */
export default function ProfilePage() {
  const [saved, setSaved] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  useEffect(() => {
    client.GET("/me/profile").then(({ data }) => {
      if (data) {
        setSaved(data);
        setForm(data);
      }
    });
  }, []);

  if (!form || !saved) {
    return (
      <>
        <SettingsHeader tab="Profile" />
        <p className={styles.muted}>Loading profile…</p>
      </>
    );
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm({ ...form, [key]: value });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { data, error } = await client.PUT("/me/profile", {
      body: {
        name: form.name.trim(),
        phone: form.phone?.trim() || null,
        location: form.location?.trim() || null,
        timezone: form.timezone,
        currency: form.currency,
        bio: form.bio?.trim() || null,
        website: form.website?.trim() || null,
      },
    });
    if (error || !data)
      return setStatus({
        ok: false,
        text: "Couldn't save — check the website address and fields.",
      });
    setSaved(data);
    setForm(data);
    setStatus({ ok: true, text: "Profile saved." });
  }

  return (
    <>
      <SettingsHeader tab="Profile" />
      {status && (
        <p className={status.ok ? styles.ok : styles.error} role="status">
          {status.text}
        </p>
      )}
      <form onSubmit={save}>
        <section className={styles.card}>
          <div className={styles.photo}>
            <span className={styles.avatar}>{form.name[0]?.toUpperCase()}</span>
            <span className={styles.muted}>Your initial is shown across Creator OS.</span>
          </div>
        </section>
        <section className={styles.card}>
          <h3>Personal information</h3>
          <div className={styles.grid}>
            <label>
              Full name
              <input
                className="field"
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              Email
              <input className="field" value={form.email ?? ""} disabled />
              <small>Email is managed by your login and cannot be changed here.</small>
            </label>
            <label>
              Phone number
              <input
                className="field"
                type="tel"
                maxLength={40}
                placeholder="+91 98765 43210"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            </label>
            <label>
              Default currency
              <select
                className="field"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as Profile["currency"])}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
            <label>
              Location
              <input
                className="field"
                maxLength={120}
                placeholder="City, Country"
                value={form.location ?? ""}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>
            <label>
              Timezone
              <select
                className="field"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              >
                {timezones.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
              <small>Used for quiet hours.</small>
            </label>
          </div>
          <label className={styles.full}>
            Bio
            <textarea
              className="field"
              rows={3}
              maxLength={BIO_MAX}
              placeholder="Tell us about yourself..."
              value={form.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
            />
            <small>
              {(form.bio ?? "").length}/{BIO_MAX} chars
            </small>
          </label>
        </section>
        <section className={styles.card}>
          <h3>Links</h3>
          <label className={styles.full}>
            Website
            <input
              className="field"
              type="url"
              maxLength={300}
              placeholder="https://yourwebsite.com"
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value)}
            />
          </label>
        </section>
        <div className={styles.actions}>
          <button type="submit" className="btn" disabled={!dirty || !form.name.trim()}>
            Save changes
          </button>
        </div>
      </form>
    </>
  );
}
