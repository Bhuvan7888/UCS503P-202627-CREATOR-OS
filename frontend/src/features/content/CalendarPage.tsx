"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Send } from "lucide-react";
import { PageHeader, useWorkspace } from "@/features/workspaces";
import { AddContentWizard } from "./components/AddContentWizard";
import { ContentItemDialog } from "./components/ContentItemDialog";
import { PLATFORMS, PLATFORM_LABEL, type ContentItem, type Platform } from "./constants/content";
import { useContent } from "./hooks/useContent";
import {
  gridDays,
  localIsoDate,
  periodTitle,
  shift,
  type CalendarView,
} from "./utils/calendar-dates";
import styles from "./content.module.css";

const PLATFORM_COLOR = Object.fromEntries(PLATFORMS.map((p) => [p.value, p.color]));
const DUE_COLOR = "var(--color-ink-faint)";
const SOCIAL_COLOR = "var(--color-ink-soft)";
const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: Infinity },
];
const DAY_MS = 86_400_000;

function chipColor(item: ContentItem): string {
  const first = item.target_platforms[0];
  return first === "youtube" || first === "instagram" ? PLATFORM_COLOR[first] : SOCIAL_COLOR;
}

/** When the item goes (or went) out: the schedule, else the publish time. */
function airTime(item: ContentItem): string | null {
  return item.scheduled_at ?? item.published_at ?? null;
}

/** Schedule: week/month calendar of scheduled and due content, plus a feed of what is planned and published. */
export default function CalendarPage() {
  const { workspace, base } = useWorkspace();
  const { items, setItems, refresh } = useContent(workspace.slug);
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [wizardDate, setWizardDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [range, setRange] = useState(30);
  const [query, setQuery] = useState("");

  const days = gridDays(view, anchor);
  const today = localIsoDate(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, { item: ContentItem; due: boolean }[]>();
    const add = (key: string, entry: { item: ContentItem; due: boolean }) =>
      map.set(key, [...(map.get(key) ?? []), entry]);
    for (const item of items ?? []) {
      if (item.scheduled_at) add(localIsoDate(new Date(item.scheduled_at)), { item, due: false });
      if (item.due_date) add(item.due_date, { item, due: true });
    }
    return map;
  }, [items]);

  const feed = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- the range is relative to now by design
    const now = Date.now();
    const q = query.trim().toLowerCase();
    return (items ?? [])
      .filter((i) => airTime(i))
      .filter((i) => platform === "all" || i.target_platforms.includes(platform))
      .filter((i) => Math.abs(new Date(airTime(i)!).getTime() - now) <= range * DAY_MS)
      .filter((i) => !q || i.title.toLowerCase().includes(q))
      .sort((a, b) => airTime(b)!.localeCompare(airTime(a)!));
  }, [items, platform, range, query]);

  const editing = items?.find((i) => i.id === editingId) ?? null;

  return (
    <>
      <PageHeader
        base={base}
        icon={CalendarDays}
        title="Schedule"
        subtitle="What is planned, and what has already gone out"
        actions={
          <button type="button" className="btn btn-row" onClick={() => setWizardDate("")}>
            <Send size={14} /> Schedule Post
          </button>
        }
      />

      <section className={styles.panelCard}>
        <h3>Content Calendar</h3>
        <p className={styles.cardSub}>Plan your content: pick a day to add an idea due that day</p>
        <div className={styles.calBar}>
          <strong>{periodTitle(view, anchor)}</strong>
          <div className={styles.calControls}>
            <div className={styles.segmented} role="group" aria-label="Calendar view">
              {(["month", "week"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === "month" ? "Month" : "Week"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-outline"
              aria-label="Previous"
              onClick={() => setAnchor(shift(view, anchor, -1))}
            >
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setAnchor(new Date())}>
              Today
            </button>
            <button
              type="button"
              className="btn btn-outline"
              aria-label="Next"
              onClick={() => setAnchor(shift(view, anchor, 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className={styles.calGrid}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className={styles.calHead}>
              {d}
            </span>
          ))}
          {days.map((d) => {
            const key = localIsoDate(d);
            const dimmed = view === "month" && d.getMonth() !== anchor.getMonth();
            const label = d.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <div
                key={key}
                className={`${styles.calCell} ${view === "week" ? styles.calCellTall : ""} ${dimmed ? styles.dim : ""} ${key === today ? styles.today : ""}`}
              >
                <button
                  type="button"
                  className={styles.calDay}
                  aria-label={`Add content for ${label}`}
                  onClick={() => setWizardDate(key)}
                >
                  {d.getDate()}
                </button>
                {(byDay.get(key) ?? []).map(({ item, due }) => (
                  <button
                    key={`${item.id}-${due}`}
                    type="button"
                    className={styles.chip}
                    style={{ borderLeftColor: due ? DUE_COLOR : chipColor(item) }}
                    title={due ? `Due: ${item.title}` : `Scheduled: ${item.title}`}
                    onClick={() => setEditingId(item.id)}
                  >
                    {due ? "Due · " : ""}
                    {item.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <ul className={styles.legend} aria-label="Legend">
          <li>
            <span style={{ background: PLATFORM_COLOR.youtube }} /> YouTube
          </li>
          <li>
            <span style={{ background: PLATFORM_COLOR.instagram }} /> Instagram
          </li>
          <li>
            <span style={{ background: SOCIAL_COLOR }} /> Social
          </li>
          <li>
            <span style={{ background: DUE_COLOR }} /> Content Due
          </li>
        </ul>
      </section>

      <section className={styles.panelCard} aria-label="Feed">
        <div className={styles.feedBar}>
          <div className={styles.chips} role="group" aria-label="Platform">
            {[{ value: "all" as const, label: "All" }, ...PLATFORMS].map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={platform === p.value}
                onClick={() => setPlatform(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.chips} role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                aria-pressed={range === r.days}
                onClick={() => setRange(r.days)}
              >
                {r.label}
              </button>
            ))}
            <button type="button" aria-label="Refresh" onClick={refresh}>
              <RefreshCw size={13} />
            </button>
          </div>
          <input
            className="field"
            placeholder="Search title"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search title"
          />
        </div>
        {items === null ? (
          <p className={styles.cardEmpty}>Loading...</p>
        ) : feed.length === 0 ? (
          <p className={styles.cardEmpty}>No items found.</p>
        ) : (
          <ul className={styles.recent}>
            {feed.map((item) => (
              <li key={item.id}>
                <span className={styles.grow}>
                  <strong>{item.title}</strong>
                  <small>
                    {item.target_platforms.map((p) => PLATFORM_LABEL[p]).join(", ") ||
                      "No platforms"}{" "}
                    ·{" "}
                    {new Date(airTime(item)!).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </small>
                </span>
                <span className={`pill ${item.stage === "published" ? "pill-ok" : "pill-neu"}`}>
                  {item.stage === "published" ? "Published" : "Scheduled"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <ContentItemDialog
          item={editing}
          workspace={workspace.slug}
          base={base}
          onClose={() => setEditingId(null)}
          onSaved={(saved) =>
            setItems((list) => list?.map((i) => (i.id === saved.id ? saved : i)) ?? null)
          }
        />
      )}
      <AddContentWizard
        open={wizardDate !== null}
        workspace={workspace.slug}
        base={base}
        initialDueDate={wizardDate || undefined}
        onClose={() => setWizardDate(null)}
        onSaved={(item) => setItems((list) => [item, ...(list ?? [])])}
      />
    </>
  );
}
