"use client";

import { useCallback, useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import type { ContentItem, ContentStats } from "../constants/content";

/** The workspace's content items (newest change first) and, optionally, the Home KPIs. */
export function useContent(workspace: string, withStats = false) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const path = { workspace };
    const [list, kpis] = await Promise.all([
      client.GET("/workspaces/{workspace}/content", { params: { path } }),
      withStats ? client.GET("/workspaces/{workspace}/content/stats", { params: { path } }) : null,
    ]);
    if (list.error || !list.data) {
      setError("Couldn't load your content. Try Refresh.");
      return;
    }
    setError(null);
    setItems(list.data);
    if (kpis?.data) setStats(kpis.data);
  }, [workspace, withStats]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / workspace change
    refresh();
  }, [refresh]);

  return { items, setItems, stats, error, refresh };
}
