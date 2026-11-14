"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import client from "@/shared/lib/api-client";
import {
  CATEGORY_INFO,
  NOTIFICATIONS_CHANGED,
  UNREAD_POLL_MS,
  ago,
  type Category,
  type Notification,
} from "../constants/notifications";
import styles from "../notifications.module.css";

const POPOVER_SIZE = 8;

/** Top-bar bell: unread count (polled) and the latest notifications. */
export function NotificationBell({ slug, base }: { slug: string; base: string }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const box = useRef<HTMLDivElement>(null);
  const path = { workspace: slug };

  const refreshCount = useCallback(async () => {
    const { data } = await client.GET("/workspaces/{workspace}/notifications/unread-count", {
      params: { path: { workspace: slug } },
    });
    if (data) setUnread(data.unread);
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first count, then a poll
    refreshCount();
    const timer = setInterval(refreshCount, UNREAD_POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED, refreshCount);
    return () => {
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) =>
      box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function toggle() {
    if (!open) {
      const { data } = await client.GET("/workspaces/{workspace}/notifications", {
        params: { path },
      });
      setItems(data ?? []);
    }
    setOpen(!open);
  }

  async function openItem(n: Notification) {
    if (!n.read_at) {
      await client.POST("/workspaces/{workspace}/notifications/read", {
        params: { path },
        body: { ids: [n.id] },
      });
      refreshCount();
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const shown = (items ?? [])
    .filter(
      (n) =>
        (readFilter === "all" || !n.read_at) && (category === "all" || n.category === category),
    )
    .slice(0, POPOVER_SIZE);

  return (
    <div className={styles.bellWrap} ref={box}>
      <button
        type="button"
        className={styles.bell}
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 && <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Notifications">
          <div className={styles.popHead}>
            <strong>Notifications</strong>
            <span className="pill pill-neu">{unread} unread</span>
          </div>
          <div className={styles.popFilters}>
            <select
              className="field"
              aria-label="Read state"
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as "all" | "unread")}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
            </select>
            <select
              className="field"
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | "all")}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_INFO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          {shown.length === 0 ? (
            <p className={styles.popEmpty}>
              <Bell size={20} />
              No notifications found
            </p>
          ) : (
            <ul className={styles.popList}>
              {shown.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={n.read_at ? undefined : styles.unread}
                  >
                    <strong>{n.title}</strong>
                    {n.body && <span>{n.body}</span>}
                    <small>
                      {CATEGORY_INFO[n.category].label} · {ago(n.created_at)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`${base}/notifications`}
            className={styles.popAll}
            onClick={() => setOpen(false)}
          >
            View All Notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
