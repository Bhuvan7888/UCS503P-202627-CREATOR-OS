"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import client from "@/lib/api";
import { loadSession, clearSession } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import {
  LayoutGrid,
  BarChart3,
  Handshake,
  MessageCircle,
  FileText,
  Package,
  CreditCard,
  Activity as ActivityIcon,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  role: "brand" | "creator";
}

export function AppShell({ children, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const fallbackLabel = role === "brand" ? "Brand" : "Creator";
  const [accountLabel, setAccountLabel] = useState(fallbackLabel);
  // A handful of routes (contracts/deliverables/payments) are only defined
  // once, under the brand route group, so a creator visiting them still gets
  // wrapped by a layout that hardcodes role="brand". The session's own role
  // is always accurate (it comes from the JWT), so it wins once loaded.
  const [effectiveRole, setEffectiveRole] = useState(role);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkUnread() {
      const session = loadSession();
      if (!session) {
        if (!cancelled) setHasUnread(false);
        return;
      }
      try {
        const { data } = await client.GET("/messages/unread");
        if (!cancelled && data) {
          setHasUnread(Boolean(data.has_unread));
        }
      } catch {
        // ignore errors
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, 4000);

    const onUpdate = () => checkUnread();
    window.addEventListener("messagesUpdated", onUpdate);
    window.addEventListener("focus", onUpdate);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("messagesUpdated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [pathname]);

  useEffect(() => {
    // Deliberate: localStorage is only readable client-side, so this must run
    // post-mount to avoid an SSR/hydration mismatch (rather than a lazy useState
    // initializer, which would reintroduce that mismatch).
    const session = loadSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountLabel(session?.brand_name ?? session?.display_name ?? fallbackLabel);
    if (session?.role) {
      setEffectiveRole(session.role);
    }
  }, [fallbackLabel]);

  function logout() {
    clearSession();
    router.push("/");
  }

  const brandNav = [
    { name: "Deals", href: "/brand", icon: LayoutGrid },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Chat", href: "/chat", icon: MessageCircle },
    { name: "Contracts", href: "/contracts", icon: FileText },
    { name: "Deliverables", href: "/deliverables", icon: Package },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Activity", href: "/activity", icon: ActivityIcon },
  ];

  const creatorNav = [
    { name: "Dashboard", href: "/creator", icon: Handshake },
    { name: "My Board", href: "/creator/board", icon: LayoutGrid },
    { name: "Chats", href: "/chat", icon: MessageCircle },
    { name: "Contracts", href: "/contracts", icon: FileText },
    { name: "Deliverables", href: "/deliverables", icon: Package },
    { name: "Payments", href: "/payments", icon: CreditCard },
  ];

  const nav = effectiveRole === "brand" ? brandNav : creatorNav;
  const dashboardHref = effectiveRole === "brand" ? "/brand" : "/creator";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-canvas)" }}>
      <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
        <Link href={dashboardHref} className="logo">
          <span className="mark" />
          <span className="label">Creator OS</span>
        </Link>
        {nav.map((item) => {
          const Icon = item.icon;
          const isChat = item.href === "/chat";
          const showDot = isChat && hasUnread;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`item ${pathname === item.href ? "on" : ""}`}
            >
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={17} strokeWidth={2} />
                {showDot && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-danger, #C4351C)",
                      boxShadow: "0 0 0 2px var(--color-canvas, #F6F4EF)",
                    }}
                  />
                )}
              </span>
              {item.name}
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "14px", marginTop: "12px" }}>
          <div style={{ marginBottom: "8px" }}>
            <StatusPill status={effectiveRole === "brand" ? "BRAND" : "CREATOR"} variant={effectiveRole === "brand" ? "accent" : "success"} />
          </div>
          <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "8px" }}>{accountLabel}</div>
          <button
            onClick={logout}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              font: "inherit",
              fontSize: "13px",
              color: "var(--color-ink-soft)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Log out
          </button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "20px 22px" }}>
        {children}
      </div>
    </div>
  );
}
