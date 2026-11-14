"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Plus, Search, UserPlus, Users, type LucideIcon } from "lucide-react";
import { Dialog } from "@/shared/components/ui/Dialog";
import { DEAL_STAGE_LABEL } from "@/shared/constants/deal-stages";
import { useCreators, useDeals } from "@/shared/lib/brand-queries";
import styles from "@/shared/components/shell/shell.module.css";
import { BRAND_NAV } from "../constants/nav";

interface Entry {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  quick?: boolean;
}

const QUICK: Entry[] = [
  {
    label: "New deal",
    hint: "Start a campaign with a creator",
    href: "/deals?new=1",
    icon: Plus,
    quick: true,
  },
  {
    label: "Onboard creator",
    hint: "Add a creator you work with",
    href: "/creators?new=1",
    icon: UserPlus,
    quick: true,
  },
  ...BRAND_NAV.flatMap((g) => g.items).map((i) => ({
    label: i.label,
    hint: `Go to ${i.label}`,
    href: i.href,
    icon: i.icon,
    quick: true,
  })),
];

/** ⌘K for the brand app: quick actions and pages, plus deals and creators by name. */
export function BrandCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const deals = useDeals().data;
  const creators = useCreators().data;

  const q = query.trim().toLowerCase();
  const records: Entry[] = [
    ...(deals ?? []).map((d) => ({
      label: d.campaign_name,
      hint: `Deal · ${DEAL_STAGE_LABEL[d.status] ?? d.status}`,
      href: `/deals/${d.id}`,
      icon: Handshake,
    })),
    ...(creators ?? []).map((c) => ({
      label: c.display_name,
      hint: `Creator · @${c.instagram_handle.replace(/^@/, "")}`,
      href: `/creators/${c.id}`,
      icon: Users,
    })),
  ];
  const results = q
    ? [...QUICK, ...records].filter((e) => e.label.toLowerCase().includes(q))
    : QUICK;

  function close() {
    setQuery("");
    setActive(0);
    onClose();
  }

  function go(entry: Entry | undefined) {
    if (!entry) return;
    close();
    router.push(entry.href);
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
            placeholder="Search deals, creators and actions…"
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
      {results.length === 0 && <p className={styles.muted}>No matches.</p>}
      <ul className={styles.paletteList} role="listbox" aria-label="Results">
        {results.map((entry, i) => {
          const Icon = entry.icon;
          return (
            <li key={`${entry.href}-${i}`} role="option" aria-selected={i === active}>
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
