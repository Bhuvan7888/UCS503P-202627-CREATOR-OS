"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { loadSession, clearSession } from "@/shared/lib/session";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { useUnreadMessages } from "@/features/messages";
import {
  LayoutGrid,
  BarChart3,
  MessageCircle,
  FileText,
  Package,
  CreditCard,
  Activity as ActivityIcon,
} from "lucide-react";

/** Shell of the brand app. Creators use the workspace shell (/dashboard) instead. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountLabel, setAccountLabel] = useState("Brand");
  const hasUnread = useUnreadMessages(pathname);

  useEffect(() => {
    // Deliberate: localStorage is only readable client-side, so this must run
    // post-mount to avoid an SSR/hydration mismatch (rather than a lazy useState
    // initializer, which would reintroduce that mismatch).
    const session = loadSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountLabel(session?.brand_name ?? "Brand");
    if (session?.role === "creator") {
      // creators work in their workspace (/dashboard); these pages are the brand app
      router.replace("/dashboard");
    }
  }, [router]);

  function logout() {
    clearSession();
    router.push("/");
  }

  const nav = [
    { name: "Deals", href: "/brand", icon: LayoutGrid },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Chat", href: "/chat", icon: MessageCircle },
    { name: "Contracts", href: "/contracts", icon: FileText },
    { name: "Deliverables", href: "/deliverables", icon: Package },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Activity", href: "/activity", icon: ActivityIcon },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-canvas)" }}>
      <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
        <Link href="/brand" className="logo">
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
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
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
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "14px",
            marginTop: "12px",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            <StatusPill status="BRAND" variant="accent" />
          </div>
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 600,
              color: "var(--color-ink)",
              marginBottom: "8px",
            }}
          >
            {accountLabel}
          </div>
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
      <div style={{ flex: 1, padding: "20px 22px" }}>{children}</div>
    </div>
  );
}
