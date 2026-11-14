"use client";

import React, { useState } from "react";
import { Activity } from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useQuery } from "@/shared/lib/query-cache";
import page from "@/shared/components/shell/page.module.css";

const actionLabel = (action: string) => action.replace(/_/g, " ");

/** Brand: everything that happened across the brand's deals, newest first, plus manual notes. */
export default function ActivityLogPage() {
  const log = useQuery("brand:activity", async () => (await client.GET("/activity-log")).data);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPending(true);
    setError(null);
    const { data, error: apiError } = await client.POST("/activity-log", {
      body: { action: "manual_note", note: note.trim() },
    });
    setPending(false);
    if (apiError || !data) return setError("Couldn't add the note.");
    log.mutate((items) => [data, ...(items ?? [])]);
    setNote("");
  }

  const items = [...(log.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Activity}
        title="Activity"
        subtitle="Everything that happened across your deals"
      />
      <section className={page.card}>
        <form className={page.inlineForm} onSubmit={addNote}>
          <label>
            Add a note
            <input
              className="field"
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Call with the creator about timelines"
            />
          </label>
          <button className="btn" type="submit" disabled={pending || !note.trim()}>
            {pending ? "Adding…" : "Add note"}
          </button>
        </form>
        {error && (
          <p className={page.errorBox} role="alert">
            {error}
          </p>
        )}
        {items.length ? (
          <ul className={page.list}>
            {items.map((entry) => (
              <li key={entry.id}>
                <span className={page.grow}>
                  <span>
                    <strong>{entry.actor_type === "brand" ? "You" : "Creator"}</strong> ·{" "}
                    {actionLabel(entry.action)}
                    {typeof entry.metadata?.note === "string" && ` — ${entry.metadata.note}`}
                  </span>
                  <small>{new Date(entry.created_at).toLocaleString()}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={page.empty}>
            {log.data
              ? "No activity yet. Every action across your deals is logged here."
              : log.error
                ? "Couldn't load activity. Try refreshing."
                : "Loading…"}
          </p>
        )}
      </section>
    </>
  );
}
