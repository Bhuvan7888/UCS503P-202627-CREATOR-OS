"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Bell,
  CheckCheck,
  Clock,
  UserCheck,
  Zap,
} from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useWorkspace } from "@/features/workspaces";
import {
  CATEGORY_INFO,
  ago,
  announceNotificationsChanged,
  type Notification,
} from "./constants/notifications";
import styles from "./notifications.module.css";

type ReadFilter = "all" | "unread" | "read";

/** The inbox: everything the workspace told you, with search, read filters, chips and an archive. */
export default function NotificationsPage() {
  const { workspace, base } = useWorkspace();
  const router = useRouter();
  const path = { workspace: workspace.slug };
  const [items, setItems] = useState<Notification[] | null>(null);
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [chips, setChips] = useState({ assignments: false, deadlines: false, high: false });

  const load = useCallback(async () => {
    const { data } = await client.GET("/workspaces/{workspace}/notifications", {
      params: { path: { workspace: workspace.slug }, query: { archived } },
    });
    setItems(data ?? []);
  }, [workspace.slug, archived]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / archive toggle
    load();
  }, [load]);

  async function markAll() {
    await client.POST("/workspaces/{workspace}/notifications/read", { params: { path }, body: {} });
    announceNotificationsChanged();
    load();
  }

  async function open(n: Notification) {
    if (!n.read_at) {
      await client.POST("/workspaces/{workspace}/notifications/read", {
        params: { path },
        body: { ids: [n.id] },
      });
      announceNotificationsChanged();
    }
    if (n.link) router.push(n.link);
    else load();
  }

  async function archive(n: Notification) {
    await client.POST("/workspaces/{workspace}/notifications/{notification_id}/archive", {
      params: { path: { ...path, notification_id: n.id } },
    });
    announceNotificationsChanged();
    load();
  }

  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter(
    (n) =>
      (!q || `${n.title} ${n.body}`.toLowerCase().includes(q)) &&
      (readFilter === "all" || (readFilter === "unread" ? !n.read_at : !!n.read_at)) &&
      (!chips.assignments || n.category === "task_assignments") &&
      (!chips.deadlines || n.category === "deadlines") &&
      (!chips.high || n.priority === "high"),
  );

  return (
    <div className={styles.page}>
      <PageHeader
        base={base}
        icon={Zap}
        title={archived ? "Archived notifications" : "Notifications"}
        crumb="Notifications"
        subtitle="Stay updated with workspace activity"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline btn-row"
              onClick={markAll}
              disabled={archived}
            >
              <CheckCheck size={14} /> Mark all read
            </button>
            <button type="button" className="btn btn-outline btn-row" onClick={() => router.back()}>
              <ArrowLeft size={14} /> Back
            </button>
          </>
        }
      />
      <input
        className="field"
        placeholder="Search notifications..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search notifications"
      />
      <div className={styles.toolbar}>
        <div className={styles.segmented} role="group" aria-label="Read state">
          {(["all", "unread", "read"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={readFilter === r}
              onClick={() => setReadFilter(r)}
            >
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={chips.assignments}
          onClick={() => setChips({ ...chips, assignments: !chips.assignments })}
        >
          <UserCheck size={13} /> Assignments
        </button>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={chips.deadlines}
          onClick={() => setChips({ ...chips, deadlines: !chips.deadlines })}
        >
          <Clock size={13} /> Deadlines
        </button>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={chips.high}
          onClick={() => setChips({ ...chips, high: !chips.high })}
        >
          <AlertCircle size={13} /> High Priority
        </button>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={archived}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={13} /> {archived ? "Back to inbox" : "View Archive"}
        </button>
      </div>
      {items === null && <p className={styles.muted}>Loading…</p>}
      {items !== null && shown.length === 0 && (
        <section className={styles.empty}>
          <Bell size={24} />
          <strong>
            {items.length
              ? "Nothing matches"
              : archived
                ? "Nothing archived"
                : "No notifications yet"}
          </strong>
          <span>
            {items.length
              ? "Try another filter."
              : "You're all caught up! New notifications will appear here when there's activity in your workspace."}
          </span>
        </section>
      )}
      {shown.length > 0 && (
        <ul className={styles.list} aria-label="Notifications">
          {shown.map((n) => (
            <li key={n.id} className={n.read_at ? undefined : styles.unread}>
              <button type="button" className={styles.itemBody} onClick={() => open(n)}>
                <strong>
                  {n.priority === "high" && <span className="pill pill-warn">High</span>} {n.title}
                </strong>
                {n.body && <span>{n.body}</span>}
                <small>
                  {CATEGORY_INFO[n.category].label} · {ago(n.created_at)}
                </small>
              </button>
              {!archived && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Archive ${n.title}`}
                  onClick={() => archive(n)}
                >
                  <Archive size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
