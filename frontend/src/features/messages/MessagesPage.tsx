"use client";

import React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useQuery } from "@/shared/lib/query-cache";
import { useWorkspace } from "@/features/workspaces";
import { ChatView } from "./components/ChatView";

/** Creator workspace: chat with the brands you're connected to (Settings → Brands). */
export default function MessagesPage() {
  const { base } = useWorkspace();
  const brands = useQuery(
    "creator:brands",
    async () => (await client.GET("/creators/me/brands")).data,
  );

  return (
    <>
      <PageHeader
        base={base}
        icon={MessageCircle}
        title="Messages"
        subtitle="Talk to the brands you work with on Creator OS"
      />
      <ChatView
        self="creator"
        contacts={brands.data?.map((b) => ({ id: b.id, label: b.name })) ?? null}
        emptyText={
          <>
            No brands yet. Ask a brand for its invite code and enter it in{" "}
            <Link href={`${base}/settings/brands`}>Settings → Brands</Link>.
          </>
        }
      />
    </>
  );
}
