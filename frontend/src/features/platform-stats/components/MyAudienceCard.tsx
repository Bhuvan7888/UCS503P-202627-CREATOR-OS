"use client";

import React from "react";
import Link from "next/link";
import client from "@/shared/lib/api-client";
import { useQuery } from "@/shared/lib/query-cache";
import { AudienceCard } from "./AudienceCard";

/** Creator Home: the owner's own platform analytics, with a shortcut to update them. */
export function MyAudienceCard({ settingsHref }: { settingsHref: string }) {
  const audience = useQuery(
    "creator:audience",
    async () => (await client.GET("/platform-stats/me")).data,
  );
  return (
    <AudienceCard
      audience={audience.data}
      title="Audience"
      subtitle="Your followers per platform (entered by you until platforms are connected)"
      action={
        <Link href={settingsHref} className="btn btn-outline btn-row">
          Update analytics
        </Link>
      }
      emptyText={
        <>
          No numbers yet. <Link href={settingsHref}>Add today&apos;s analytics</Link> so your Home
          and the brands you work with see your reach.
        </>
      }
    />
  );
}
