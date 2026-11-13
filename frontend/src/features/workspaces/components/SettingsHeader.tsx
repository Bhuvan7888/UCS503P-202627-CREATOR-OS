"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { PageHeader } from "./PageHeader";
import styles from "../workspace-shell.module.css";

const TABS = [
  { label: "Workspace", path: "/settings/workspace" },
  { label: "AI knowledge", path: "/settings/ai-knowledge" },
];

/** Settings page header plus the tab bar; each tab is its own route. */
export function SettingsHeader({ tab }: { tab: string }) {
  const { base } = useWorkspace();
  const pathname = usePathname();
  return (
    <>
      <PageHeader
        base={base}
        icon={Settings}
        title="Settings"
        crumb={`Settings › ${tab}`}
        subtitle="Manage your workspace, team and preferences"
      />
      <nav className={styles.tabs} aria-label="Settings sections">
        {TABS.map((t) => (
          <Link
            key={t.path}
            href={`${base}${t.path}`}
            className={pathname === `${base}${t.path}` ? styles.tabOn : undefined}
            aria-current={pathname === `${base}${t.path}` ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
