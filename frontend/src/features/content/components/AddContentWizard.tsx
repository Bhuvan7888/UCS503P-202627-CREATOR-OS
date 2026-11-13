"use client";

import React, { useEffect, useState } from "react";
import { Check, Clapperboard, FileImage, Film, Lightbulb, Smartphone, Video } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { Dialog } from "@/shared/components/ui/Dialog";
import { GenerateButton } from "@/features/ai-assist";
import Link from "next/link";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABEL,
  PLATFORMS,
  PLATFORM_LABEL,
  type ContentItem,
  type ContentType,
  type Platform,
} from "../constants/content";
import styles from "../content.module.css";

type Member = components["schemas"]["MemberOut"];
type Draft = components["schemas"]["ContentItemCreate"];

const STEPS = ["Content Type", "Basic Info", "Content Details", "Assignment", "Review"];
const TYPE_ICON = {
  long_form_video: Video,
  post: FileImage,
  reel: Film,
  story: Smartphone,
  short_form_video: Clapperboard,
} satisfies Record<ContentType, unknown>;

const EMPTY: Draft = {
  type: "long_form_video",
  title: "",
  description: "",
  pillar: "",
  hook: "",
  target_platforms: [],
  due_date: null,
  assignee_user_id: null,
};

interface Props {
  open: boolean;
  workspace: string;
  /** Route prefix of the workspace, for the "generate content ideas" link. */
  base: string;
  /** Pre-filled due date (YYYY-MM-DD), e.g. from a calendar day. */
  initialDueDate?: string;
  onClose: () => void;
  onSaved: (item: ContentItem) => void;
}

/** "Add New Content Idea": type → title → pillar/hook/platforms → due date/assignee → review. */
export function AddContentWizard({
  open,
  workspace,
  base,
  initialDueDate,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-fill when opened from a calendar day
    if (open && initialDueDate) setDraft((d) => ({ ...d, due_date: initialDueDate }));
  }, [open, initialDueDate]);

  useEffect(() => {
    if (!open) return;
    client
      .GET("/workspaces/{workspace}/members", { params: { path: { workspace } } })
      .then(({ data }) => setMembers(data ?? []));
  }, [open, workspace]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canNext =
    (step !== 1 || draft.title.trim() !== "") &&
    (step !== 2 || (draft.pillar.trim() !== "" && draft.hook.trim() !== ""));

  function close() {
    setStep(0);
    setDraft(EMPTY);
    setError(null);
    onClose();
  }

  function togglePlatform(p: Platform) {
    const current = draft.target_platforms ?? [];
    set("target_platforms", current.includes(p) ? current.filter((x) => x !== p) : [...current, p]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const body: Draft = {
      ...draft,
      title: draft.title.trim(),
      pillar: draft.pillar.trim(),
      hook: draft.hook.trim(),
      description: draft.description?.trim() || null,
    };
    const { data, error: apiError } = await client.POST("/workspaces/{workspace}/content", {
      params: { path: { workspace } },
      body,
    });
    setSaving(false);
    if (apiError || !data) {
      setError("Couldn't save this idea. Check the fields and try again.");
      return;
    }
    onSaved(data);
    close();
  }

  const aiDraft = {
    type: draft.type,
    title: draft.title,
    description: draft.description,
    pillar: draft.pillar,
    hook: draft.hook,
  };
  const ai = (field: "title" | "description" | "hook", label: string) => (
    <GenerateButton
      workspace={workspace}
      field={field}
      label={label}
      draft={aiDraft}
      onText={(text) => set(field, text)}
    />
  );

  const assignee = members.find((m) => m.user_id === draft.assignee_user_id);

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add New Content Idea"
      width={860}
      header={
        <div className={styles.wizardHead}>
          <span className={styles.bulb}>
            <Lightbulb size={18} />
          </span>
          <div>
            <h2>Add New Content Idea</h2>
            <p>Capture a new content idea to grow your pipeline.</p>
          </div>
        </div>
      }
      footer={
        <>
          {error && <p className={styles.wizardError}>{error}</p>}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => (step === 0 ? close() : setStep(step - 1))}
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn"
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
            >
              Next
            </button>
          ) : (
            <button type="button" className="btn" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save Content"}
            </button>
          )}
        </>
      }
    >
      <ol className={styles.stepper} aria-label="Steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={i < step ? styles.stepDone : i === step ? styles.stepOn : undefined}
            aria-current={i === step ? "step" : undefined}
          >
            <span className={styles.stepDot}>{i < step ? <Check size={12} /> : i + 1}</span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset className={styles.fieldset}>
          <legend>What type of content do you want to create?</legend>
          <p className={styles.help}>
            Choose the content type that best fits your idea. You can customize it for different
            platforms later.
          </p>
          <div className={styles.typeGrid}>
            {CONTENT_TYPES.map((t) => {
              const Icon = TYPE_ICON[t.value];
              const on = draft.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeCard} ${on ? styles.selected : ""}`}
                  aria-pressed={on}
                  onClick={() => set("type", t.value)}
                >
                  <Icon size={20} />
                  <strong>{t.label}</strong>
                  <small>{t.platforms} platforms</small>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <div className={styles.fieldset}>
          <div className={styles.label}>
            <span className={styles.fieldHead}>
              <label htmlFor="cw-title">
                Title <span className={styles.req}>*</span>
              </label>
              {ai("title", "Generate Title")}
            </span>
            <input
              id="cw-title"
              className="field"
              autoFocus
              maxLength={200}
              placeholder="Enter content title..."
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className={styles.label}>
            <span className={styles.fieldHead}>
              <label htmlFor="cw-description">Description</label>
              {ai("description", "Generate Description")}
            </span>
            <textarea
              id="cw-description"
              className="field"
              rows={4}
              maxLength={2000}
              placeholder="Enter a brief description..."
              value={draft.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <p className={styles.help}>
            Keep it concise. You can refine it later.{" "}
            <Link href={`${base}/ai-suggestions`}>Need more ideas? Generate content ideas</Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className={styles.fieldset}>
          <label className={styles.label}>
            Content Pillar <span className={styles.req}>*</span>
            <input
              className="field"
              autoFocus
              maxLength={120}
              placeholder="e.g., Education, Entertainment..."
              value={draft.pillar}
              onChange={(e) => set("pillar", e.target.value)}
            />
          </label>
          <div className={styles.label}>
            <span className={styles.fieldHead}>
              <label htmlFor="cw-hook">
                Hook <span className={styles.req}>*</span>
              </label>
              {ai("hook", "Generate Hook")}
            </span>
            <input
              id="cw-hook"
              className="field"
              maxLength={500}
              placeholder="Engaging opening line..."
              value={draft.hook}
              onChange={(e) => set("hook", e.target.value)}
            />
          </div>
          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>Target Platforms</legend>
            <div className={styles.platforms}>
              {PLATFORMS.map((p) => {
                const on = draft.target_platforms?.includes(p.value) ?? false;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`${styles.platform} ${on ? styles.selected : ""}`}
                    aria-pressed={on}
                    onClick={() => togglePlatform(p.value)}
                  >
                    <span className={styles.platformDot} style={{ background: p.color }} />
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className={styles.help}>
              Planning tags for where this will go. Creator OS doesn&apos;t post for you.
            </p>
          </fieldset>
        </div>
      )}

      {step === 3 && (
        <div className={styles.fieldset}>
          <label className={styles.label}>
            Due Date
            <input
              className="field"
              type="date"
              value={draft.due_date ?? ""}
              onChange={(e) => set("due_date", e.target.value || null)}
            />
          </label>
          <label className={styles.label}>
            Assign To
            <select
              className="field"
              value={draft.assignee_user_id ?? ""}
              onChange={(e) => set("assignee_user_id", e.target.value || null)}
            >
              <option value="">Select team member...</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} ({m.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className={styles.fieldset}>
          <h3 className={styles.reviewTitle}>Review Content Details</h3>
          <dl className={styles.review}>
            <dt>Title</dt>
            <dd>{draft.title}</dd>
            <dt>Description</dt>
            <dd>{draft.description?.trim() || "None"}</dd>
            <dt>Pillar</dt>
            <dd>{draft.pillar}</dd>
            <dt>Hook</dt>
            <dd>{draft.hook}</dd>
            <dt>Type</dt>
            <dd>{CONTENT_TYPE_LABEL[draft.type ?? "long_form_video"]}</dd>
            <dt>Channels</dt>
            <dd>
              {draft.target_platforms?.length
                ? draft.target_platforms.map((p) => PLATFORM_LABEL[p]).join(", ")
                : "0 selected"}
            </dd>
            <dt>Due Date</dt>
            <dd>{draft.due_date ?? "Not set"}</dd>
            <dt>Assigned To</dt>
            <dd>{assignee ? assignee.name : "Unassigned"}</dd>
          </dl>
        </div>
      )}
    </Dialog>
  );
}
