"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  FileText,
  KanbanSquare,
  LayoutGrid,
  Lightbulb,
  PenLine,
  Plus,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, useWorkspace } from "@/features/workspaces";
import { AddContentWizard } from "./components/AddContentWizard";
import { CONTENT_TYPE_LABEL, PLATFORMS, STAGE_LABEL, type ContentStats } from "./constants/content";
import { useContent } from "./hooks/useContent";
import styles from "./content.module.css";

const RECENT_COUNT = 5;
const bannerKey = (workspaceId: string) => `creatoros_onboarding_dismissed_${workspaceId}`;

const KPIS: { key: keyof Omit<ContentStats, "by_platform">; label: string; icon: LucideIcon }[] = [
  { key: "total", label: "Total Content", icon: FileText },
  { key: "scripted", label: "Scripted", icon: PenLine },
  { key: "published", label: "Published", icon: CircleCheck },
  { key: "ideas", label: "Ideas", icon: Sparkles },
];

export default function HomePage() {
  const { workspace, base } = useWorkspace();
  const { items, setItems, stats, error, refresh } = useContent(workspace.slug, true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setBannerDismissed(localStorage.getItem(bannerKey(workspace.id)) === "1");
  }, [workspace.id]);

  function dismissBanner() {
    localStorage.setItem(bannerKey(workspace.id), "1");
    setBannerDismissed(true);
  }

  const recent = [...(items ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, RECENT_COUNT);
  const platformRows = PLATFORMS.map((p) => ({ ...p, count: stats?.by_platform[p.value] ?? 0 }));
  const maxPlatform = Math.max(1, ...platformRows.map((p) => p.count));

  return (
    <>
      <PageHeader
        base={base}
        icon={LayoutGrid}
        title="Overview"
        subtitle="Welcome back! Here's what's happening with your content."
        actions={
          <>
            <button type="button" className="btn btn-outline btn-row" onClick={refresh}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn-row" onClick={() => setWizardOpen(true)}>
              <Plus size={14} /> Create
            </button>
          </>
        }
      />

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      {items?.length === 0 && !bannerDismissed && (
        <section className={styles.banner}>
          <h3>Your workspace is ready. Let&apos;s make one thing.</h3>
          <p>Nothing to configure. One idea is enough to start.</p>
          <div className={styles.emptyActions}>
            <button type="button" className="btn btn-row" onClick={() => setWizardOpen(true)}>
              Add my first idea <ArrowRight size={14} />
            </button>
            <button type="button" className="btn btn-text" onClick={dismissBanner}>
              I&apos;ll do this later
            </button>
          </div>
          <span className={styles.hint}>Takes about 30 seconds.</span>
        </section>
      )}

      <div className={styles.kpis}>
        {KPIS.map(({ key, label, icon: Icon }) => {
          const kpi = stats?.[key];
          const delta = kpi?.delta_pct;
          return (
            <section key={key} className={styles.kpi} aria-label={label}>
              <div className={styles.kpiHead}>
                <span>{label}</span>
                <Icon size={16} />
              </div>
              <strong>{kpi ? kpi.value : "—"}</strong>
              <small className={delta == null ? styles.flat : delta < 0 ? styles.down : styles.up}>
                {delta == null
                  ? "Last 30 days"
                  : `${delta >= 0 ? "+" : ""}${delta}% vs previous 30 days`}
              </small>
            </section>
          );
        })}
      </div>

      <div className={styles.twoUp}>
        <section className={styles.panelCard}>
          <h3>Content by platform</h3>
          <p className={styles.cardSub}>Planned items per target platform</p>
          {stats && platformRows.some((p) => p.count > 0) ? (
            <ul className={styles.bars}>
              {platformRows.map((p) => (
                <li key={p.value}>
                  <span>{p.label}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.bar}
                      style={{ width: `${(p.count / maxPlatform) * 100}%`, background: p.color }}
                    />
                  </span>
                  <span className={styles.barValue}>{p.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.cardEmpty}>
              No platform data yet. Tag platforms when you add content.
            </p>
          )}
        </section>

        <section className={styles.panelCard}>
          <div className={styles.cardHeadRow}>
            <div>
              <h3>Recent Content</h3>
              <p className={styles.cardSub}>Your latest content updates</p>
            </div>
            <Link href={`${base}/kanban`} className="btn btn-text btn-row">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length ? (
            <ul className={styles.recent}>
              {recent.map((item) => (
                <li key={item.id}>
                  <span className={styles.grow}>
                    <strong>{item.title}</strong>
                    <small>
                      {CONTENT_TYPE_LABEL[item.type]} ·{" "}
                      {new Date(item.updated_at).toLocaleDateString()}
                    </small>
                  </span>
                  <span className={`pill ${item.stage === "published" ? "pill-ok" : "pill-neu"}`}>
                    {STAGE_LABEL[item.stage]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.cardEmpty}>{items === null ? "Loading…" : "Nothing here yet."}</p>
          )}
        </section>
      </div>

      <section className={styles.panelCard}>
        <h3>Quick Actions</h3>
        <p className={styles.cardSub}>Jump to your most used features</p>
        <div className={styles.quick}>
          <Link href={`${base}/kanban`} className={styles.quickTile}>
            <KanbanSquare size={18} />
            <strong>Content Pipeline</strong>
            <small>Manage content</small>
          </Link>
          <button type="button" className={styles.quickTile} onClick={() => setWizardOpen(true)}>
            <Lightbulb size={18} />
            <strong>New idea</strong>
            <small>Capture it in 30 seconds</small>
          </button>
        </div>
      </section>

      <AddContentWizard
        open={wizardOpen}
        workspace={workspace.slug}
        onClose={() => setWizardOpen(false)}
        onSaved={(item) => {
          setItems((list) => [item, ...(list ?? [])]);
          refresh();
        }}
      />
    </>
  );
}
