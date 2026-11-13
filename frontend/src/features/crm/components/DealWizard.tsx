"use client";

import React, { useState } from "react";
import { Check, Handshake } from "lucide-react";
import client from "@/shared/lib/api-client";
import { Dialog } from "@/shared/components/ui/Dialog";
import {
  CURRENCIES,
  PRIORITIES,
  STATUSES,
  type CrmDeal,
  type CrmDealCreate,
} from "../constants/crm";
import styles from "../crm.module.css";

const STEPS = ["Contact", "Deal", "Timeline", "Content"];

const EMPTY: CrmDealCreate = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  phone: "",
  deal_size: 0,
  currency: "INR",
  status: "prospect",
  priority: "medium",
  expected_close_date: null,
  next_follow_up_date: null,
  tags: [],
  notes: "",
};

interface Props {
  workspace: string;
  /** Edit this deal; omit to create a new one. */
  deal?: CrmDeal;
  onClose: () => void;
  onSaved: (deal: CrmDeal) => void;
}

/** Create New Deal (4 steps: Contact, Deal, Timeline, Content) — also used to edit a deal. */
export function DealWizard({ workspace, deal, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CrmDealCreate>(deal ? { ...EMPTY, ...deal } : EMPTY);
  const [tag, setTag] = useState("");
  const [withContent, setWithContent] = useState(false);
  const [content, setContent] = useState({ title: "", hook: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CrmDealCreate>(key: K, value: CrmDealCreate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const path = { workspace };

  function addTag() {
    const t = tag.trim();
    if (t && !(form.tags ?? []).includes(t)) set("tags", [...(form.tags ?? []), t]);
    setTag("");
  }

  async function save() {
    if (!form.company_name.trim()) {
      setStep(0);
      setError("Add the company name.");
      return;
    }
    if (withContent && !content.hook.trim()) {
      setError("Add a hook for the content item, or untick it.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      company_name: form.company_name.trim(),
      contact_name: form.contact_name?.trim() || null,
      contact_email: form.contact_email?.trim() || null,
      phone: form.phone?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    const res = deal
      ? await client.PATCH("/workspaces/{workspace}/crm/deals/{deal_id}", {
          params: { path: { ...path, deal_id: deal.id } },
          body,
        })
      : await client.POST("/workspaces/{workspace}/crm/deals", { params: { path }, body });
    if (res.error || !res.data) {
      setSaving(false);
      setError("Couldn't save the deal. Check the fields and try again.");
      return;
    }
    if (withContent) {
      const made = await client.POST("/workspaces/{workspace}/content", {
        params: { path },
        body: {
          title: content.title.trim() || `${body.company_name} — sponsored content`,
          type: "long_form_video",
          pillar: "Sponsorship",
          hook: content.hook.trim(),
          target_platforms: [],
          crm_deal_id: res.data.id,
        },
      });
      if (made.error) {
        setSaving(false);
        setError("The deal is saved, but the content item couldn't be created.");
        onSaved(res.data);
        return;
      }
    }
    setSaving(false);
    onSaved(res.data);
    onClose();
  }

  const last = step === STEPS.length - 1;

  return (
    <Dialog
      open
      onClose={onClose}
      title={deal ? "Edit Deal" : "Create New Deal"}
      width={680}
      header={
        <div className={styles.wizardHead}>
          <span className={styles.wizardIcon}>
            <Handshake size={18} />
          </span>
          <div>
            <h2>{deal ? "Edit Deal" : "Create New Deal"}</h2>
            <p>Manage your brand partnerships and associated content creation.</p>
          </div>
        </div>
      }
      footer={
        <>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          >
            {step === 0 ? "Cancel" : "Previous"}
          </button>
          {last ? (
            <button type="button" className="btn btn-row" disabled={saving} onClick={save}>
              <Check size={14} /> {saving ? "Saving…" : deal ? "Save Deal" : "Finish & Save Deal"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </>
      }
    >
      <ol className={styles.dots} aria-label="Steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={i <= step ? styles.dotOn : undefined}
            aria-current={i === step ? "step" : undefined}
          >
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className={styles.form}>
          <h3>Contact Information</h3>
          <p className={styles.muted}>Who is this deal with?</p>
          <label>
            Company Name <span className={styles.req}>*</span>
            <input
              className="field"
              autoFocus
              maxLength={120}
              placeholder="Enter company name"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
            />
          </label>
          <label>
            Contact Name
            <input
              className="field"
              maxLength={120}
              placeholder="e.g., Jane Doe"
              value={form.contact_name ?? ""}
              onChange={(e) => set("contact_name", e.target.value)}
            />
          </label>
          <div className={styles.row2}>
            <label>
              Contact Email
              <input
                className="field"
                type="email"
                maxLength={254}
                placeholder="e.g., jane.doe@company.com"
                value={form.contact_email ?? ""}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </label>
            <label>
              Phone Number
              <input
                className="field"
                type="tel"
                maxLength={40}
                placeholder="+91 98765 43210"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.form}>
          <h3>Deal Details</h3>
          <p className={styles.muted}>What are the terms of the deal?</p>
          <div className={styles.row2}>
            <label>
              Deal Size
              <input
                className="field"
                type="number"
                min={0}
                value={form.deal_size ?? 0}
                onChange={(e) => set("deal_size", Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
            <label>
              Currency
              <select
                className="field"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as CrmDealCreate["currency"])}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.row2}>
            <label>
              Status
              <select
                className="field"
                value={form.status}
                onChange={(e) => set("status", e.target.value as CrmDealCreate["status"])}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                className="field"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as CrmDealCreate["priority"])}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.form}>
          <h3>Timeline & Notes</h3>
          <p className={styles.muted}>Key dates and other details.</p>
          <div className={styles.row2}>
            <label>
              Expected Close Date
              <input
                className="field"
                type="date"
                value={form.expected_close_date ?? ""}
                onChange={(e) => set("expected_close_date", e.target.value || null)}
              />
            </label>
            <label>
              Next Follow-up Date
              <input
                className="field"
                type="date"
                value={form.next_follow_up_date ?? ""}
                onChange={(e) => set("next_follow_up_date", e.target.value || null)}
              />
            </label>
          </div>
          <div>
            <label htmlFor="deal-tag">Tags</label>
            <div className={styles.tagRow}>
              <input
                id="deal-tag"
                className="field"
                placeholder="Add a tag"
                maxLength={40}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" className="btn btn-outline" onClick={addTag}>
                Add
              </button>
            </div>
            <div className={styles.tags}>
              {(form.tags ?? []).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="pill pill-neu"
                  aria-label={`Remove tag ${t}`}
                  onClick={() =>
                    set(
                      "tags",
                      (form.tags ?? []).filter((x) => x !== t),
                    )
                  }
                >
                  {t} ×
                </button>
              ))}
            </div>
          </div>
          <label>
            Notes
            <textarea
              className="field"
              rows={3}
              maxLength={4000}
              placeholder="Add any relevant notes about the deal..."
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className={styles.form}>
          <h3>Content Creation</h3>
          <p className={styles.muted}>Define content deliverables for this deal.</p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={withContent}
              onChange={(e) => setWithContent(e.target.checked)}
            />
            Create a content item for this deal
          </label>
          {withContent && (
            <>
              <label>
                Content title
                <input
                  className="field"
                  maxLength={200}
                  placeholder={`${form.company_name || "Brand"} — sponsored content`}
                  value={content.title}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                />
              </label>
              <label>
                Hook <span className={styles.req}>*</span>
                <input
                  className="field"
                  maxLength={500}
                  placeholder="Engaging opening line..."
                  value={content.hook}
                  onChange={(e) => setContent({ ...content, hook: e.target.value })}
                />
              </label>
              <p className={styles.muted}>
                It lands in your Content Pipeline as an idea linked to this deal.
              </p>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
