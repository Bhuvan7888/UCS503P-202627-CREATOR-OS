"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import styles from "@/shared/components/shell/shell.module.css";

// `anyOf`: shown when the caller's role has one of these (personal tabs have none);
// `ownerOnly`: backed by the owner's own creator profile
const TABS: { label: string; path: string; anyOf?: string[]; ownerOnly?: boolean }[] = [
  { label: "Profile", path: "/settings/profile" },
  {
    label: "Workspace",
    path: "/settings/workspace",
    anyOf: ["view_settings", "manage_workspace", "invite_members"],
  },
  { label: "AI knowledge", path: "/settings/ai-knowledge", anyOf: ["view_settings"] },
  { label: "Brands", path: "/settings/brands", ownerOnly: true },
  { label: "Notifications", path: "/settings/notifications" },
  { label: "API keys", path: "/settings/api-keys", anyOf: ["manage_workspace"] },
  { label: "Webhooks", path: "/settings/webhooks", anyOf: ["manage_workspace"] },
];

/** Settings page header plus the tab bar; each tab is its own route. */
export function SettingsHeader({ tab }: { tab: string }) {
  const { base, workspace } = useWorkspace();
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
        {TABS.filter((t) =>
          t.ownerOnly
            ? workspace.role === "owner"
            : !t.anyOf || t.anyOf.some((p) => workspace.permissions?.includes(p)),
        ).map((t) => (
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
