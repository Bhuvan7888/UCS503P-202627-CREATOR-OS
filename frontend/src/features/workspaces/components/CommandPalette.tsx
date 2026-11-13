"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Handshake,
  House,
  KanbanSquare,
  PenLine,
  Plus,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import client from "@/shared/lib/api-client";
import { Dialog } from "@/shared/components/ui/Dialog";
import styles from "../workspace-shell.module.css";

interface Entry {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  quick?: boolean;
}

/** ⌘K palette: quick actions with an empty query, plus the workspace's content titles. */
export function CommandPalette({
  open,
  onClose,
  slug,
  base,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  base: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [content, setContent] = useState<Entry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    client
      .GET("/workspaces/{workspace}/content", { params: { path: { workspace: slug } } })
      .then(({ data }) => {
        if (!live) return;
        setContent(
          (data ?? []).map((item) => ({
            label: item.title,
            hint: `Content · ${item.stage.replace("_", " ")}`,
            href: `${base}/kanban`,
            icon: FileText,
          })),
        );
      });
    return () => {
      live = false;
    };
  }, [open, slug, base]);

  const quickActions: Entry[] = useMemo(
    () => [
      {
        label: "Create New Content",
        hint: "Open the content pipeline to add new content",
        href: `${base}/kanban?new=1`,
        icon: Plus,
        quick: true,
      },
      {
        label: "Content Pipeline",
        hint: "Manage content from idea to publication",
        href: `${base}/kanban`,
        icon: KanbanSquare,
        quick: true,
      },
      {
        label: "Generate AI Script",
        hint: "Go to scripts to write with AI outlines",
        href: `${base}/scripts`,
        icon: PenLine,
        quick: true,
      },
      {
        label: "AI Content Suggestions",
        hint: "Get new content ideas for this workspace",
        href: `${base}/ai-suggestions`,
        icon: Sparkles,
        quick: true,
      },
      {
        label: "Schedule Content",
        hint: "View and manage your content calendar",
        href: `${base}/schedule`,
        icon: CalendarDays,
        quick: true,
      },
      {
        label: "Manage Brands",
        hint: "Access your Brand CRM",
        href: `${base}/crm`,
        icon: Handshake,
        quick: true,
      },
      { label: "Home", hint: "Workspace overview", href: base, icon: House, quick: true },
    ],
    [base],
  );

  const q = query.trim().toLowerCase();
  const results = q
    ? [...quickActions, ...(content ?? [])].filter((e) => e.label.toLowerCase().includes(q))
    : quickActions;

  function go(entry: Entry | undefined) {
    if (!entry) return;
    close();
    router.push(entry.href);
  }

  function close() {
    setQuery("");
    setActive(0);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    else if (e.key === "Enter") go(results[active]);
    else return;
    e.preventDefault();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Search"
      width={640}
      header={
        <div className={styles.paletteInput}>
          <Search size={16} />
          <input
            autoFocus
            placeholder="Search content and actions…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            aria-label="Search"
          />
        </div>
      }
      footer={
        <div className={styles.paletteFoot}>
          <span>
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
          <span>↑↓ Navigate · Enter Select · Esc Close</span>
        </div>
      }
    >
      {q && content === null && <p className={styles.muted}>Loading content…</p>}
      {results.length === 0 && content !== null && <p className={styles.muted}>No matches.</p>}
      <ul className={styles.paletteList} role="listbox" aria-label="Results">
        {results.map((entry, i) => {
          const Icon = entry.icon;
          return (
            <li key={`${entry.label}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? styles.paletteOn : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(entry)}
              >
                <Icon size={16} />
                <span className={styles.paletteLabel}>
                  {entry.label}
                  <small>{entry.hint}</small>
                </span>
                {entry.quick && <span className="pill pill-neu">Quick Action</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
