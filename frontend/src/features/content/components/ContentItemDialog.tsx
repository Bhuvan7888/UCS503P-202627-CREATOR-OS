"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, Send } from "lucide-react";
import client from "@/shared/lib/api-client";
import { Dialog } from "@/shared/components/ui/Dialog";
import { GenerateButton } from "@/features/ai-assist";
import { CONTENT_TYPES, STAGES, type ContentItem } from "../constants/content";
import { toLocalInput } from "../utils/calendar-dates";
import styles from "../content.module.css";

interface Props {
  item: ContentItem;
  workspace: string;
  base: string;
  onClose: () => void;
  onSaved: (item: ContentItem) => void;
}

/** Edit one content item (opened from a board card), with inline AI generation. */
export function ContentItemDialog({ item, workspace, base, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: item.title,
    description: item.description ?? "",
    pillar: item.pillar,
    hook: item.hook,
    type: item.type,
    stage: item.stage,
    due_date: item.due_date ?? "",
    scheduled_at: toLocalInput(item.scheduled_at),
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const valid = form.title.trim() && form.pillar.trim() && form.hook.trim();

  async function save() {
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await client.PATCH(
      "/workspaces/{workspace}/content/{item_id}",
      {
        params: { path: { workspace, item_id: item.id } },
        body: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          pillar: form.pillar.trim(),
          hook: form.hook.trim(),
          type: form.type,
          stage: form.stage,
          due_date: form.due_date || null,
          // datetime-local is in the viewer's time zone; the API stores an absolute time
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        },
      },
    );
    setSaving(false);
    if (apiError || !data) {
      setError("Couldn't save the changes.");
      return;
    }
    onSaved(data);
    onClose();
  }

  async function requestApproval() {
    setNotice(null);
    const { error: apiError } = await client.POST("/workspaces/{workspace}/approvals", {
      params: { path: { workspace } },
      body: { content_item_id: item.id },
    });
    setNotice(
      apiError
        ? typeof apiError.detail === "string"
          ? apiError.detail
          : "Couldn't send it for approval."
        : "Sent for approval — decide it on the Approvals page.",
    );
  }

  const draft = { ...form, description: form.description || null };
  const ai = (field: "title" | "description" | "hook", label: string) => (
    <GenerateButton
      workspace={workspace}
      field={field}
      label={label}
      draft={draft}
      onText={(t) => set(field, t)}
    />
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit content"
      width={720}
      footer={
        <>
          {(error || notice) && (
            <p className={error ? styles.wizardError : styles.wizardNotice} role="status">
              {error ?? notice}
            </p>
          )}
          {item.stage !== "published" && (
            <button type="button" className="btn btn-outline btn-row" onClick={requestApproval}>
              <Send size={14} /> Request approval
            </button>
          )}
          <Link href={`${base}/scripts?item=${item.id}`} className="btn btn-outline btn-row">
            <FileText size={14} /> Open script
          </Link>
          <button type="button" className="btn" disabled={!valid || saving} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <div className={styles.fieldset}>
        <div className={styles.label}>
          <span className={styles.fieldHead}>
            <label htmlFor="ci-title">Title</label>
            {ai("title", "Generate Title")}
          </span>
          <input
            id="ci-title"
            className="field"
            maxLength={200}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div className={styles.label}>
          <span className={styles.fieldHead}>
            <label htmlFor="ci-description">Description</label>
            {ai("description", "Generate Description")}
          </span>
          <textarea
            id="ci-description"
            className="field"
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <label className={styles.label}>
          Content Pillar
          <input
            className="field"
            maxLength={120}
            value={form.pillar}
            onChange={(e) => set("pillar", e.target.value)}
          />
        </label>
        <div className={styles.label}>
          <span className={styles.fieldHead}>
            <label htmlFor="ci-hook">Hook</label>
            {ai("hook", "Generate Hook")}
          </span>
          <input
            id="ci-hook"
            className="field"
            maxLength={500}
            value={form.hook}
            onChange={(e) => set("hook", e.target.value)}
          />
        </div>
        <div className={styles.row3}>
          <label className={styles.label}>
            Type
            <select
              className="field"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Stage
            <select
              className="field"
              value={form.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Due Date
            <input
              className="field"
              type="date"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Scheduled for
            <input
              className="field"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => set("scheduled_at", e.target.value)}
            />
          </label>
        </div>
      </div>
    </Dialog>
  );
}
