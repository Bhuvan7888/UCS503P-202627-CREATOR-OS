"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, PanelLeft, Search } from "lucide-react";
import { clearSession, loadSession } from "@/shared/lib/session";
import { useUnreadMessages } from "@/features/messages";
import styles from "@/shared/components/shell/shell.module.css";
import { BrandCommandPalette } from "./components/BrandCommandPalette";
import { BRAND_HOME, BRAND_NAV, isActive } from "./constants/nav";

const SIDEBAR_COLLAPSED_KEY = "creatoros_sidebar_collapsed";

/** Shell of the brand app — the same sidebar, top bar (⌘K) and account menu as the creator workspace. */
export default function BrandShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // null until the session is read (localStorage is client-only); pages render only for a brand session
  const [brandName, setBrandName] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasUnread = useUnreadMessages(pathname);

  useEffect(() => {
    const session = loadSession();
    if (!session) return router.replace("/brand/login");
    // creators work in their workspace; these pages are the brand app
    if (session.role === "creator") return router.replace("/dashboard");
    /* eslint-disable react-hooks/set-state-in-effect */
    setBrandName(session.brand_name ?? "Brand");
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleSidebar() {
    setCollapsed((c) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });
  }

  function signOut() {
    clearSession();
    router.push("/brand/login");
  }

  if (brandName === null) return <div className={styles.loading}>Loading…</div>;
  const initial = brandName[0]?.toUpperCase() ?? "B";

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside className={styles.sidebar} aria-label="Sidebar">
        <Link href={BRAND_HOME} className={styles.switcher}>
          <span className={styles.logoTile}>{initial}</span>
          <span className={styles.switcherText}>
            <strong>{brandName}</strong>
            <small>Brand account</small>
          </span>
        </Link>

        <nav className={styles.nav}>
          {BRAND_NAV.map((group) => (
            <div key={group.label} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${isActive(item, pathname) ? styles.on : ""}`}
                    title={item.label}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {item.href === "/chat" && hasUnread && (
                      <span className="pill pill-bad" aria-label="Unread messages">
                        New
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.popAnchor}>
          {menuOpen && (
            <div className={`${styles.popover} ${styles.popUp}`} role="menu">
              <div className={styles.userHead}>
                <span className={styles.avatar}>{initial}</span>
                <span className={styles.grow}>
                  <strong>{brandName}</strong>
                  <small>Brand</small>
                </span>
              </div>
              <button type="button" className={styles.popItem} onClick={signOut} role="menuitem">
                <LogOut size={14} />
                <span className={styles.grow}>Sign out</span>
              </button>
            </div>
          )}
          <button
            type="button"
            className={styles.userCard}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <span className={styles.avatar}>{initial}</span>
            <span className={styles.switcherText}>
              <strong>{brandName}</strong>
              <small>Brand</small>
            </span>
            <ChevronsUpDown size={14} className={styles.chev} />
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <PanelLeft size={16} />
          </button>
          <span className={styles.divider} />
          <button type="button" className={styles.search} onClick={() => setPaletteOpen(true)}>
            <Search size={14} />
            <span>Search deals and creators…</span>
            <kbd>⌘K</kbd>
          </button>
          <span className={styles.spacer} />
        </div>
        <main className={styles.panel} onClick={() => menuOpen && setMenuOpen(false)}>
          {children}
        </main>
      </div>
      <BrandCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
