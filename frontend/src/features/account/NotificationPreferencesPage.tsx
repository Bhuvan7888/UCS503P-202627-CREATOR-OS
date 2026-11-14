"use client";

import React, { useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { SettingsHeader } from "@/features/workspaces";
import styles from "./account.module.css";

type Prefs = components["schemas"]["NotificationPreferences"];
type Category = keyof NonNullable<Prefs["categories"]>;

const CATEGORIES: {
  key: Category;
  label: string;
  description: string;
  defaults: { in_app: boolean; email: boolean };
}[] = [
  {
    key: "task_assignments",
    label: "Task Assignments",
    description: "When you are assigned to work on content",
    defaults: { in_app: true, email: true },
  },
  {
    key: "publishing_updates",
    label: "Publishing Updates",
    description: "Publishes waiting for approval, approved or rejected",
    defaults: { in_app: true, email: true },
  },
  {
    key: "deadlines",
    label: "Deadlines & Reminders",
    description: "Content due tomorrow",
    defaults: { in_app: true, email: false },
  },
  {
    key: "workspace_activity",
    label: "Workspace Activity",
    description: "Team member changes",
    defaults: { in_app: true, email: false },
  },
];
const DEFAULTS: Prefs = {
  do_not_disturb: false,
  quiet_hours_enabled: false,
  quiet_start: "22:00:00",
  quiet_end: "07:00:00",
  categories: {},
};

/** Settings › Notifications: what reaches your inbox and your email (applies in every workspace). */
export default function NotificationPreferencesPage() {
  const [saved, setSaved] = useState<Prefs | null>(null);
  const [form, setForm] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    client.GET("/me/notification-preferences").then(({ data }) => {
      if (data) {
        setSaved(data);
        setForm(data);
      }
    });
  }, []);

  if (!form || !saved) {
    return (
      <>
        <SettingsHeader tab="Notifications" />
        <p className={styles.muted}>Loading…</p>
      </>
    );
  }

  const pref = (c: (typeof CATEGORIES)[number]) => form.categories?.[c.key] ?? c.defaults;
  const setPref = (c: (typeof CATEGORIES)[number], key: "in_app" | "email", value: boolean) =>
    setForm({ ...form, categories: { ...form.categories, [c.key]: { ...pref(c), [key]: value } } });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  async function save() {
    if (!form) return;
    const { data, error } = await client.PUT("/me/notification-preferences", { body: form });
    if (error || !data) return setStatus("Couldn't save your preferences.");
    setSaved(data);
    setForm(data);
    setStatus("Preferences saved.");
  }

  return (
    <>
      <SettingsHeader tab="Notifications" />
      <div className={styles.actions}>
        {status && (
          <span className={styles.muted} role="status">
            {status}
          </span>
        )}
        <button type="button" className="btn btn-outline" onClick={() => setForm({ ...DEFAULTS })}>
          Reset to Defaults
        </button>
        <button type="button" className="btn" disabled={!dirty} onClick={save}>
          Save Changes
        </button>
      </div>
      <section className={styles.card}>
        <h3>Global Settings</h3>
        <label className={styles.switchRow}>
          <span>
            <strong>Do Not Disturb</strong>
            <small>Pause all notification emails</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={form.do_not_disturb}
            onChange={(e) => setForm({ ...form, do_not_disturb: e.target.checked })}
          />
        </label>
        <label className={styles.switchRow}>
          <span>
            <strong>Quiet Hours</strong>
            <small>No emails during these hours (your profile&apos;s timezone)</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={form.quiet_hours_enabled}
            onChange={(e) => setForm({ ...form, quiet_hours_enabled: e.target.checked })}
          />
        </label>
        {form.quiet_hours_enabled && (
          <div className={styles.grid}>
            <label>
              From
              <input
                className="field"
                type="time"
                value={(form.quiet_start ?? "22:00").slice(0, 5)}
                onChange={(e) => setForm({ ...form, quiet_start: e.target.value })}
              />
            </label>
            <label>
              To
              <input
                className="field"
                type="time"
                value={(form.quiet_end ?? "07:00").slice(0, 5)}
                onChange={(e) => setForm({ ...form, quiet_end: e.target.value })}
              />
            </label>
          </div>
        )}
      </section>
      <section className={styles.card}>
        <h3>Notification Categories</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>In-App</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.key}>
                <td>
                  <strong>{c.label}</strong>
                  <small>{c.description}</small>
                </td>
                <td>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`${c.label} in-app`}
                    checked={pref(c).in_app}
                    onChange={(e) => setPref(c, "in_app", e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`${c.label} email`}
                    checked={pref(c).email}
                    onChange={(e) => setPref(c, "email", e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
