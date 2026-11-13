"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LogOut, PanelLeft, Plus, Search } from "lucide-react";
import client from "@/shared/lib/api-client";
import { clearSession, loadSession, type AuthSession } from "@/shared/lib/session";
import { CommandPalette } from "./components/CommandPalette";
import { NAV_GROUPS, SIDEBAR_COLLAPSED_KEY } from "./constants/nav";
import { WorkspaceContext, type MyWorkspace } from "./hooks/useWorkspace";
import styles from "./workspace-shell.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; workspace: MyWorkspace; all: MyWorkspace[] };

/** Every workspace page: sidebar, top bar with ⌘K, and the content column. */
export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { workspace: ref } = useParams<{ workspace: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menu, setMenu] = useState<"workspaces" | "user" | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await client.GET("/workspaces");
    const all = data ?? [];
    const workspace = all.find((w) => w.slug === ref || w.id === ref);
    if (!workspace) return setState({ kind: "missing" });
    if (workspace.slug !== ref) {
      // URLs accept the id too; show the short slug
      router.replace(pathname.replace(`/dashboard/${ref}`, `/dashboard/${workspace.slug}`));
    }
    setState({ kind: "ready", workspace, all });
  }, [ref, pathname, router]);

  useEffect(() => {
    // localStorage is client-only, so the session and sidebar preference are read after mount
    const s = loadSession();
    if (!s) {
      router.replace("/creator/login");
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setSession(s);
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
    load();
  }, [load, router]);

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
    router.push("/creator/login");
  }

  async function newWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    const { data, error } = await client.POST("/workspaces", { body: { name } });
    if (error || !data) {
      setWsError(
        typeof error?.detail === "string" ? error.detail : "Couldn't create the workspace.",
      );
      return;
    }
    setWsError(null);
    setMenu(null);
    router.push(`/dashboard/${data.slug}`);
  }

  if (state.kind === "loading" || !session) {
    return <div className={styles.loading}>Loading workspace…</div>;
  }
  if (state.kind === "missing") {
    return (
      <div className={styles.loading}>
        <p>This workspace doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/dashboard" className="btn">
          Go to my workspace
        </Link>
      </div>
    );
  }

  const { workspace, all } = state;
  const base = `/dashboard/${workspace.slug}`;
  const name = session.display_name ?? session.brand_name ?? "Account";

  return (
    <WorkspaceContext.Provider value={{ workspace, base }}>
      <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
        <aside className={styles.sidebar} aria-label="Sidebar">
          <div className={styles.popAnchor}>
            <button
              type="button"
              className={styles.switcher}
              onClick={() => setMenu(menu === "workspaces" ? null : "workspaces")}
              aria-expanded={menu === "workspaces"}
              aria-label="Switch workspace"
            >
              <span className={styles.logoTile}>{workspace.name[0]?.toUpperCase() ?? "C"}</span>
              <span className={styles.switcherText}>
                <strong>{workspace.name}</strong>
                <small>
                  {all.length} workspace{all.length === 1 ? "" : "s"}
                </small>
              </span>
              <ChevronsUpDown size={14} className={styles.chev} />
            </button>
            {menu === "workspaces" && (
              <div className={styles.popover} role="menu">
                <p className={styles.popLabel}>Workspaces</p>
                {all.map((w) => (
                  <Link
                    key={w.id}
                    href={`/dashboard/${w.slug}`}
                    className={styles.popItem}
                    onClick={() => setMenu(null)}
                    role="menuitem"
                  >
                    <span className={styles.letter}>{w.name[0]?.toUpperCase()}</span>
                    <span className={styles.grow}>{w.name}</span>
                    {w.id === workspace.id && <Check size={14} />}
                  </Link>
                ))}
                <form className={styles.newWs} onSubmit={newWorkspace}>
                  <input
                    name="name"
                    placeholder="New workspace name"
                    maxLength={80}
                    className="field"
                  />
                  <button
                    type="submit"
                    className="btn btn-outline btn-row"
                    aria-label="Create workspace"
                  >
                    <Plus size={14} />
                  </button>
                </form>
                {wsError && <p className={styles.formError}>{wsError}</p>}
              </div>
            )}
          </div>

          <nav className={styles.nav}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className={styles.group}>
                <p className={styles.groupLabel}>{group.label}</p>
                {group.items.map((item) => {
                  const href = `${base}${item.path}`;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={href}
                      className={`${styles.navItem} ${pathname === href ? styles.on : ""}`}
                      title={item.label}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className={styles.popAnchor}>
            {menu === "user" && (
              <div className={`${styles.popover} ${styles.popUp}`} role="menu">
                <div className={styles.userHead}>
                  <span className={styles.avatar}>{name[0]?.toUpperCase()}</span>
                  <span className={styles.grow}>
                    <strong>{name}</strong>
                    <small>
                      {workspace.role === "owner" ? "Owner" : workspace.role.replace("_", " ")}
                    </small>
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
              onClick={() => setMenu(menu === "user" ? null : "user")}
              aria-expanded={menu === "user"}
              aria-label="Account menu"
            >
              <span className={styles.avatar}>{name[0]?.toUpperCase()}</span>
              <span className={styles.switcherText}>
                <strong>{name}</strong>
                <small>{session.role === "creator" ? "Creator" : "Brand"}</small>
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
              <span>Search workspace…</span>
              <kbd>⌘K</kbd>
            </button>
          </div>
          <main className={styles.panel} onClick={() => menu && setMenu(null)}>
            {children}
          </main>
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        slug={workspace.slug}
        base={base}
      />
    </WorkspaceContext.Provider>
  );
}
