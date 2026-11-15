"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import shell from "@/shared/components/shell/shell.module.css";

const TABS = [
  { label: "Brand profile", href: "/settings" },
  { label: "AI knowledge", href: "/settings/ai" },
  { label: "Account", href: "/settings/account" },
];

/** Brand Settings header plus its tab bar (each tab is its own route), like the creator Settings. */
export function BrandSettingsHeader({ tab }: { tab: string }) {
  const pathname = usePathname();
  return (
    <>
      <PageHeader
        base="/brand"
        icon={Settings}
        title="Settings"
        crumb={`Settings › ${tab}`}
        subtitle="Your brand profile, what the AI knows about your brand, and your account"
      />
      <nav className={shell.tabs} aria-label="Settings sections">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={pathname === t.href ? shell.tabOn : undefined}
            aria-current={pathname === t.href ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
