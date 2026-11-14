"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  FileText,
  MessageSquare,
  Plus,
  Send,
  ShieldQuestion,
} from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { loadSession } from "@/shared/lib/session";
import { Dialog } from "@/shared/components/ui/Dialog";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useWorkspace } from "@/features/workspaces";
import styles from "./support.module.css";

type Ticket = components["schemas"]["Ticket"];
type TicketCreate = components["schemas"]["TicketCreate"];
type Tab = "Overview" | "My Tickets" | "Knowledge Base";

const CATEGORIES: { value: TicketCreate["category"]; label: string }[] = [
  { value: "general", label: "General" },
  { value: "technical", label: "Technical Issue" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_report", label: "Bug Report" },
];
const PRIORITIES: TicketCreate["priority"][] = ["low", "medium", "high", "urgent"];
const STATUS_PILL: Record<Ticket["status"], string> = {
  open: "pill-warn",
  in_progress: "pill-neu",
  resolved: "pill-ok",
  closed: "pill-neu",
};

const FAQ = [
  {
    q: "Does Creator OS post to my social accounts?",
    a: "No. Creator OS plans your content from idea to published: target platforms are planning tags, and “Approve” in Approvals marks an item Published once you've posted it yourself.",
  },
  {
    q: "How do I schedule content for multiple platforms?",
    a: "Tag the platforms in the Add Content wizard, then set “Scheduled for” in the item's editor (click a card on the board or a chip on the Calendar).",
  },
  {
    q: "Can I invite team members to my workspace?",
    a: "Yes. Settings › Workspace › Members: invite by email as Script Writer, Video Editor or Brand Manager (2 seats each). The owner decides what each role can open in Settings › Workspace › Roles.",
  },
  {
    q: "Is there a paid plan?",
    a: "No — Creator OS is free for everyone. Each person can own up to 3 workspaces.",
  },
  {
    q: "How do agents and automations connect?",
    a: "Create an API key in Settings › API keys with only the scopes it needs, and add webhook endpoints in Settings › Webhooks to receive signed events. Agents can prepare a publish, but only a person can approve it.",
  },
];

/** Help & Support: tickets for this workspace and a searchable FAQ. */
export default function SupportPage() {
  const { workspace, base } = useWorkspace();
  const [tab, setTab] = useState<Tab>("Overview");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Ticket["status"] | "all">("all");
  const [kbQuery, setKbQuery] = useState("");
  const path = { workspace: workspace.slug };

  const load = useCallback(async () => {
    const { data } = await client.GET("/workspaces/{workspace}/support/tickets", {
      params: { path: { workspace: workspace.slug } },
    });
    setTickets(data ?? []);
  }, [workspace.slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function close(t: Ticket) {
    await client.POST("/workspaces/{workspace}/support/tickets/{ticket_id}/close", {
      params: { path: { ...path, ticket_id: t.id } },
    });
    load();
  }

  const all = tickets ?? [];
  const q = query.trim().toLowerCase();
  const filtered = all.filter(
    (t) =>
      (!q || `${t.subject} ${t.description}`.toLowerCase().includes(q)) &&
      (status === "all" || t.status === status),
  );
  const kb = FAQ.filter((f) =>
    `${f.q} ${f.a}`.toLowerCase().includes(kbQuery.trim().toLowerCase()),
  );

  const list = (rows: Ticket[]) => (
    <ul className={styles.tickets} aria-label="Tickets">
      {rows.map((t) => (
        <li key={t.id}>
          <span className={styles.grow}>
            <strong>{t.subject}</strong>
            <small>
              {CATEGORIES.find((c) => c.value === t.category)?.label} · {t.priority} ·{" "}
              {new Date(t.created_at).toLocaleDateString("en-GB")}
            </small>
          </span>
          <span className={`pill ${STATUS_PILL[t.status]}`}>{t.status.replace("_", " ")}</span>
          {t.status !== "closed" && (
            <button type="button" className="btn btn-outline" onClick={() => close(t)}>
              Close
            </button>
          )}
        </li>
      ))}
    </ul>
  );
  const empty = (
    <div className={styles.empty}>
      <MessageSquare size={24} />
      <strong>No support tickets yet</strong>
      <button type="button" className="btn" onClick={() => setCreating(true)}>
        Create Your First Ticket
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        base={base}
        icon={ShieldQuestion}
        title="Help & Support"
        crumb="Support"
        subtitle={`Get help and submit support tickets for ${workspace.name}`}
      />
      <div className={styles.segmented} role="tablist" aria-label="Support sections">
        {(["Overview", "My Tickets", "Knowledge Base"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <>
          <div className={styles.tiles}>
            <button type="button" onClick={() => setCreating(true)}>
              <MessageSquare size={18} /> New Ticket
            </button>
            <button type="button" onClick={() => setTab("Knowledge Base")}>
              <BookOpen size={18} /> Browse Knowledge Base
            </button>
          </div>
          <div className={styles.kpis}>
            {[
              ["Total Tickets", all.length],
              [
                "Open Tickets",
                all.filter((t) => t.status === "open" || t.status === "in_progress").length,
              ],
              [
                "Resolved",
                all.filter((t) => t.status === "resolved" || t.status === "closed").length,
              ],
            ].map(([label, n]) => (
              <section key={label} className={styles.kpi} aria-label={String(label)}>
                <span>{label}</span>
                <strong>{tickets === null ? "—" : n}</strong>
              </section>
            ))}
          </div>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3>
                <FileText size={16} /> Recent Tickets
              </h3>
              <button type="button" className="btn btn-row" onClick={() => setCreating(true)}>
                <Plus size={14} /> New Ticket
              </button>
            </div>
            {tickets !== null && (all.length ? list(all.slice(0, 5)) : empty)}
          </section>
        </>
      )}

      {tab === "My Tickets" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <input
              className="field"
              placeholder="Search tickets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tickets"
            />
            <select
              className="field"
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Ticket["status"] | "all")}
            >
              <option value="all">All Status</option>
              {Object.keys(STATUS_PILL).map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-row" onClick={() => setCreating(true)}>
              <Plus size={14} /> New Ticket
            </button>
          </div>
          {tickets !== null &&
            (all.length === 0 ? (
              empty
            ) : filtered.length ? (
              list(filtered)
            ) : (
              <p className={styles.muted}>No tickets match.</p>
            ))}
        </section>
      )}

      {tab === "Knowledge Base" && (
        <>
          <input
            className="field"
            placeholder="Search knowledge base..."
            value={kbQuery}
            onChange={(e) => setKbQuery(e.target.value)}
            aria-label="Search knowledge base"
          />
          <section className={styles.card}>
            <h3>Frequently Asked Questions</h3>
            <p className={styles.muted}>Quick answers to common questions</p>
            {kb.length ? (
              kb.map((f) => (
                <details key={f.q} className={styles.faq}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))
            ) : (
              <p className={styles.muted}>
                No answers match your search.{" "}
                <button type="button" className={styles.link} onClick={() => setKbQuery("")}>
                  Clear search
                </button>
              </p>
            )}
          </section>
          <section className={styles.card}>
            <h3>Need More Help?</h3>
            <p className={styles.muted}>
              Can&apos;t find what you&apos;re looking for? Open a ticket and we&apos;ll get back to
              you.
            </p>
            <button type="button" className="btn" onClick={() => setCreating(true)}>
              New Ticket
            </button>
          </section>
        </>
      )}

      {creating && (
        <TicketDialog
          workspace={workspace.slug}
          workspaceName={workspace.name}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setTab("My Tickets");
            load();
          }}
        />
      )}
    </>
  );
}

function TicketDialog({
  workspace,
  workspaceName,
  onClose,
  onCreated,
}: {
  workspace: string;
  workspaceName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<TicketCreate>({
    subject: "",
    category: "general",
    priority: "medium",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const user = loadSession()?.display_name ?? "You";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await client.POST("/workspaces/{workspace}/support/tickets", {
      params: { path: { workspace } },
      body: { ...form, subject: form.subject.trim(), description: form.description.trim() },
    });
    if (err) return setError("Couldn't create the ticket.");
    onCreated();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create Support Ticket"
      width={640}
      header={
        <div className={styles.dialogHead}>
          <span className={styles.icon}>
            <AlertCircle size={18} />
          </span>
          <div>
            <h2>Create Support Ticket</h2>
            <p className={styles.muted}>
              Tell us what&apos;s going on and we&apos;ll get back to you.
            </p>
          </div>
        </div>
      }
    >
      <form className={styles.form} onSubmit={submit}>
        <label>
          Subject <span className={styles.req}>*</span>
          <input
            className="field"
            maxLength={200}
            placeholder="Brief description of your issue"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </label>
        <div className={styles.row2}>
          <label>
            Category
            <select
              className="field"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as TicketCreate["category"] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              className="field"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as TicketCreate["priority"] })
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description <span className={styles.req}>*</span>
          <textarea
            className="field"
            rows={5}
            maxLength={5000}
            placeholder="Please provide detailed information about your issue..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className={styles.context}>
          <span>Workspace: {workspaceName}</span>
          <span>User: {user}</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.footer}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-row"
            disabled={!form.subject.trim() || !form.description.trim()}
          >
            <Send size={14} /> Create Ticket
          </button>
        </div>
      </form>
    </Dialog>
  );
}
