"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import client from "@/shared/lib/api-client";
import { WORKSPACES_KEY, loadSession } from "@/shared/lib/session";
import { PENDING_INVITE_KEY } from "./constants/nav";

/** /dashboard → the user's primary workspace (created on first visit for a creator). */
export default function WorkspaceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    if (!session) return router.replace("/creator/login");
    const invite = localStorage.getItem(PENDING_INVITE_KEY);
    if (invite) return router.replace(`/invite/${invite}`);
    if (session.role === "brand") return router.replace("/brand");
    client.GET("/workspaces").then(({ data }) => {
      // the shell draws from this right away instead of asking again
      if (data) sessionStorage.setItem(WORKSPACES_KEY, JSON.stringify(data));
      const target = data?.find((w) => w.is_primary) ?? data?.[0];
      router.replace(target ? `/dashboard/${target.slug}` : "/creator/login");
    });
  }, [router]);

  return <p style={{ padding: 32, color: "var(--color-ink-soft)" }}>Opening your workspace…</p>;
}
