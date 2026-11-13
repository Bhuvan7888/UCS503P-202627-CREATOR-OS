"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Filter, KanbanSquare, Plus, X } from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader, useWorkspace } from "@/features/workspaces";
import { AddContentWizard } from "./components/AddContentWizard";
import { KanbanBoard } from "./components/KanbanBoard";
import { PLATFORMS, type ContentItem, type ContentStage, type Platform } from "./constants/content";
import { useContent } from "./hooks/useContent";
import styles from "./content.module.css";

const DAY_MS = 86_400_000;
const DATE_RANGES = [
  { value: "all", label: "All time", days: Infinity },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
];

export default function ContentPipelinePage() {
  const { workspace, base } = useWorkspace();
  const { items, setItems, error, refresh } = useContent(workspace.slug);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [channel, setChannel] = useState<Platform | "all">("all");
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    // ⌘K "Create New Content" links here with ?new=1
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the URL after mount
      setWizardOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const visible = useMemo(() => {
    const days = DATE_RANGES.find((r) => r.value === range)?.days ?? Infinity;
    // eslint-disable-next-line react-hooks/purity -- the date filter is relative to now by design
    const since = Date.now() - days * DAY_MS;
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (i) =>
        (!q || i.title.toLowerCase().includes(q)) &&
        (channel === "all" || i.target_platforms.includes(channel)) &&
        new Date(i.created_at).getTime() >= since,
    );
  }, [items, query, range, channel]);

  async function move(item: ContentItem, stage: ContentStage) {
    const previous = items;
    setItems((list) => list?.map((i) => (i.id === item.id ? { ...i, stage } : i)) ?? null);
    const { data, error: apiError } = await client.PATCH(
      "/workspaces/{workspace}/content/{item_id}",
      {
        params: { path: { workspace: workspace.slug, item_id: item.id } },
        body: { stage },
      },
    );
    if (apiError || !data) {
      setItems(previous);
      setMoveError(`Couldn't move "${item.title}". Try again.`);
      return;
    }
    setMoveError(null);
    setItems((list) => list?.map((i) => (i.id === data.id ? data : i)) ?? null);
  }

  const empty = items !== null && items.length === 0;

  return (
    <>
      <PageHeader
        base={base}
        icon={KanbanSquare}
        title="Content Pipeline"
        subtitle="Manage your content from idea to publication"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline btn-row"
              aria-pressed={showFilters}
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter size={14} /> Filters
            </button>
            <button type="button" className="btn btn-row" onClick={() => setWizardOpen(true)}>
              <Plus size={14} /> Add Content
            </button>
          </>
        }
      />

      {showFilters && (
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input
              className="field"
              placeholder="Search content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search content"
            />
            <span className={styles.counter}>
              {visible.length} of {items?.length ?? 0}
            </span>
            {query && (
              <button
                type="button"
                className={styles.clear}
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            className="field"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Date range"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Platform | "all")}
            aria-label="Channel"
          >
            <option value="all">All channels</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(error || moveError) && (
        <div className={styles.errorBox} role="alert">
          {error ?? moveError}
          {error && (
            <button type="button" className="btn btn-outline" onClick={refresh}>
              Refresh
            </button>
          )}
        </div>
      )}

      {items === null && !error && <div className={styles.skeletonBoard} aria-label="Loading" />}

      {empty && (
        <div className={styles.empty}>
          <span className={styles.emptyTile}>
            <Plus size={24} />
          </span>
          <h2>Your pipeline is empty</h2>
          <p>
            Add your first content idea and move it from concept to published — all in one place.
          </p>
          <div className={styles.emptyActions}>
            <button type="button" className="btn btn-row" onClick={() => setWizardOpen(true)}>
              <Plus size={14} /> Add your first idea
            </button>
            <span className={styles.hint}>Takes 30 seconds</span>
          </div>
          <ol className={styles.stepsRow}>
            <li>
              <strong>Add an idea</strong>
              <span>Capture your content concept with a title and type.</span>
            </li>
            <li>
              <strong>Write a script</strong>
              <span>Draft it, then move the card to Scripted.</span>
            </li>
            <li>
              <strong>Publish</strong>
              <span>Schedule it and mark it published when it&apos;s live.</span>
            </li>
          </ol>
        </div>
      )}

      {items !== null && items.length > 0 && <KanbanBoard items={visible} onMove={move} />}

      <AddContentWizard
        open={wizardOpen}
        workspace={workspace.slug}
        onClose={() => setWizardOpen(false)}
        onSaved={(item) => setItems((list) => [item, ...(list ?? [])])}
      />
    </>
  );
}
