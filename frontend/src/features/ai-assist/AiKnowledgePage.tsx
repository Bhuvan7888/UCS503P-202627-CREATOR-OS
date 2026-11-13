"use client";

import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { PageHeader, useWorkspace } from "@/features/workspaces";
import styles from "./ai-assist.module.css";

type Knowledge = components["schemas"]["AiKnowledgeSave"];

const FIELDS: { key: keyof Knowledge; label: string; hint: string }[] = [
  { key: "brand", label: "Brand", hint: "Who you are, your niche, your voice and tone." },
  {
    key: "audience",
    label: "Audience",
    hint: "Who watches you: age, interests, what they want from you.",
  },
  {
    key: "strategy",
    label: "Content strategy",
    hint: "Your pillars, goals and what has worked before.",
  },
  {
    key: "custom_output_format",
    label: "Custom output format",
    hint: "How AI answers should be written, e.g. “short sentences, no emojis, Hinglish”.",
  },
];

/** Settings › AI knowledge: what every AI feature in this workspace knows about the creator. */
export default function AiKnowledgePage() {
  const { workspace, base } = useWorkspace();
  const [form, setForm] = useState<Knowledge | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const path = { workspace: workspace.slug };

  useEffect(() => {
    client
      .GET("/workspaces/{workspace}/ai-knowledge", {
        params: { path: { workspace: workspace.slug } },
      })
      .then(({ data }) =>
        setForm(data ?? { brand: "", audience: "", strategy: "", custom_output_format: "" }),
      );
  }, [workspace.slug]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setStatus("Saving…");
    const { error } = await client.PUT("/workspaces/{workspace}/ai-knowledge", {
      params: { path },
      body: form,
    });
    setStatus(error ? "Couldn't save. Check the lengths and try again." : "Saved");
  }

  return (
    <>
      <PageHeader
        base={base}
        icon={Settings}
        title="Settings"
        crumb="Settings › AI knowledge"
        subtitle="Manage how Creator OS works for this workspace"
      />
      <nav className={styles.tabs} aria-label="Settings sections">
        <span className={styles.tabOn}>AI knowledge</span>
      </nav>
      {form === null ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <form className={styles.knowledge} onSubmit={save}>
          <p className={styles.muted}>
            Used by Generate Title, Description, Hook, script outlines and AI suggestions. The more
            context you give, the better the results.
          </p>
          {FIELDS.map((f) => (
            <label key={f.key} className={styles.label}>
              {f.label}
              <small>{f.hint}</small>
              <textarea
                className="field"
                rows={4}
                maxLength={4000}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </label>
          ))}
          <div className={styles.saveRow}>
            <button type="submit" className="btn">
              Save knowledge
            </button>
            {status && (
              <span className={styles.muted} role="status">
                {status}
              </span>
            )}
          </div>
        </form>
      )}
    </>
  );
}
