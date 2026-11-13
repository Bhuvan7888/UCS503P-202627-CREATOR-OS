"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Filter, PenLine, Plus, Save, Sparkles, Zap } from "lucide-react";
import client from "@/shared/lib/api-client";
import { GenerateButton } from "@/features/ai-assist";
import { PageHeader, useWorkspace } from "@/features/workspaces";
import { AddContentWizard } from "./components/AddContentWizard";
import { CONTENT_TYPE_LABEL, STAGE_LABEL, type ContentItem } from "./constants/content";
import { useContent } from "./hooks/useContent";
import styles from "./content.module.css";

const AUTOSAVE_MS = 1000;
type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

/** AI Script Generator: pick a content item, write its script (auto-saved), generate an outline. */
export default function ScriptsPage() {
  const { workspace, base } = useWorkspace();
  const { items, setItems, refresh } = useContent(workspace.slug);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Edit dialogs link here with ?item=<id>
    const id = new URLSearchParams(window.location.search).get("item");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the URL after mount
    if (id) setSelectedId(id);
    if (id) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const selected = items?.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the selected item's script
    setState("loading");
    client
      .GET("/workspaces/{workspace}/content/{item_id}/script", {
        params: { path: { workspace: workspace.slug, item_id: selectedId } },
      })
      .then(({ data }) => {
        if (!live) return;
        setBody(data?.body ?? "");
        setState(data ? "idle" : "error");
      });
    return () => {
      live = false;
    };
  }, [selectedId, workspace.slug]);

  async function persist(itemId: string, text: string) {
    setState("saving");
    const { error } = await client.PUT("/workspaces/{workspace}/content/{item_id}/script", {
      params: { path: { workspace: workspace.slug, item_id: itemId } },
      body: { body: text },
    });
    setState(error ? "error" : "saved");
    // the first script moves an idea to Scripted
    if (!error && text.trim())
      setItems(
        (list) =>
          list?.map((i) =>
            i.id === itemId && i.stage === "idea" ? { ...i, stage: "scripted" } : i,
          ) ?? null,
      );
  }

  function edit(text: string) {
    setBody(text);
    if (!selectedId) return;
    if (timer.current) clearTimeout(timer.current);
    const itemId = selectedId;
    timer.current = setTimeout(() => persist(itemId, text), AUTOSAVE_MS);
  }

  function select(item: ContentItem) {
    if (timer.current && selectedId) {
      // flush the pending save of the previous item before switching
      clearTimeout(timer.current);
      persist(selectedId, body);
    }
    setSelectedId(item.id);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((i) => !q || i.title.toLowerCase().includes(q));
  }, [items, query]);

  const status = {
    idle: "",
    loading: "Loading…",
    saving: "Saving…",
    saved: "Saved",
    error: "Couldn't save — keep typing to retry",
  }[state];

  return (
    <>
      <PageHeader
        base={base}
        icon={Zap}
        title="AI Script Generator"
        crumb="Scripts"
        subtitle="Create, edit, and manage your content scripts with AI assistance"
        actions={
          <button
            type="button"
            className="btn btn-outline btn-row"
            aria-pressed={showFilters}
            onClick={() => setShowFilters((s) => !s)}
          >
            <Filter size={14} /> Filters
          </button>
        }
      />
      {showFilters && (
        <div className={styles.filters}>
          <input
            className="field"
            placeholder="Search content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search content"
          />
        </div>
      )}

      <div className={styles.scripts}>
        <aside className={styles.scriptList} aria-label="Content items">
          <header className={styles.columnHead}>
            <span>Content Items</span>
            <span className={styles.count}>{items?.length ?? 0}</span>
          </header>
          {items === null && <p className={styles.hint}>Loading…</p>}
          {items?.length === 0 && (
            <div className={styles.listEmpty}>
              <FileText size={20} />
              <p>No content items yet</p>
              <span className={styles.hint}>
                Create your first content item to start writing scripts
              </span>
              <button type="button" className="btn btn-row" onClick={() => setWizardOpen(true)}>
                <Plus size={14} /> Create Content
              </button>
            </div>
          )}
          <ul>
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === selectedId ? styles.scriptOn : undefined}
                  aria-current={item.id === selectedId}
                  onClick={() => select(item)}
                >
                  <strong>{item.title}</strong>
                  <small>
                    {CONTENT_TYPE_LABEL[item.type]} · {STAGE_LABEL[item.stage]}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.editor} aria-label="Script editor">
          {selected ? (
            <>
              <div className={styles.editorHead}>
                <div className={styles.grow}>
                  <h2>{selected.title}</h2>
                  <small className={styles.hint}>
                    {selected.pillar} · “{selected.hook}”
                  </small>
                </div>
                <GenerateButton
                  workspace={workspace.slug}
                  field="outline"
                  label="Generate outline"
                  draft={{
                    type: selected.type,
                    title: selected.title,
                    description: selected.description,
                    pillar: selected.pillar,
                    hook: selected.hook,
                  }}
                  onText={(outline) => edit(body.trim() ? `${body}\n\n${outline}` : outline)}
                />
              </div>
              <textarea
                className={styles.scriptText}
                aria-label="Script"
                placeholder="Start writing, or generate an outline to begin…"
                maxLength={50_000}
                value={body}
                disabled={state === "loading"}
                onChange={(e) => edit(e.target.value)}
              />
              <p className={styles.saveState} role="status">
                <Save size={12} /> {status || "Drafts save automatically"}
              </p>
            </>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyTile}>
                <PenLine size={28} />
              </span>
              <h2>{items?.length ? "Pick a content item" : "Start Creating Scripts"}</h2>
              <p>
                {items?.length
                  ? "Choose an item on the left to write its script."
                  : "Transform your ideas into compelling scripts. Create your first content item to begin."}
              </p>
              {!items?.length && (
                <button type="button" className="btn btn-row" onClick={() => setWizardOpen(true)}>
                  <Plus size={14} /> Create Your First Content
                </button>
              )}
              <p className={styles.hint}>
                <Sparkles size={12} /> AI-powered outlines · <Save size={12} /> Auto-save drafts
              </p>
            </div>
          )}
        </section>
      </div>

      <AddContentWizard
        open={wizardOpen}
        workspace={workspace.slug}
        base={base}
        onClose={() => setWizardOpen(false)}
        onSaved={(item) => {
          refresh();
          setSelectedId(item.id);
        }}
      />
    </>
  );
}
