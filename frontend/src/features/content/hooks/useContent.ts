"use client";

import { useCallback } from "react";
import client from "@/shared/lib/api-client";
import { useQuery } from "@/shared/lib/query-cache";
import type { ContentItem, ContentStats } from "../constants/content";

export const contentKey = (workspace: string) => `content:${workspace}`;

export async function fetchContent(workspace: string): Promise<ContentItem[] | undefined> {
  const { data } = await client.GET("/workspaces/{workspace}/content", {
    params: { path: { workspace } },
  });
  return data;
}

/**
 * The workspace's content items (newest change first) and, optionally, the Home KPIs. Cached across pages:
 * revisiting Home, Content, Scripts or Calendar shows the last data at once and refreshes in the background.
 */
export function useContent(workspace: string, withStats = false) {
  const list = useQuery(contentKey(workspace), () => fetchContent(workspace));
  const kpis = useQuery(
    withStats ? `content-stats:${workspace}` : "content-stats:off",
    async () => {
      if (!withStats) return null;
      const { data } = await client.GET("/workspaces/{workspace}/content/stats", {
        params: { path: { workspace } },
      });
      return data;
    },
  );
  const { mutate } = list;
  const setItems = useCallback(
    (update: ContentItem[] | null | ((current: ContentItem[] | null) => ContentItem[] | null)) =>
      mutate(
        (current) => (typeof update === "function" ? update(current ?? null) : update) ?? undefined,
      ),
    [mutate],
  );
  const refresh = useCallback(async () => {
    await Promise.all([list.refresh(), withStats ? kpis.refresh() : null]);
  }, [list, kpis, withStats]);

  return {
    items: list.data ?? null,
    setItems,
    stats: (kpis.data as ContentStats | null | undefined) ?? null,
    error: list.error && !list.data ? "Couldn't load your content. Try Refresh." : null,
    refresh,
  };
}
