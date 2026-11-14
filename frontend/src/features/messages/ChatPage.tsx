"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useCreators } from "@/shared/lib/brand-queries";
import { ChatView } from "./components/ChatView";

/** Brand: chat with your creators (deal pages link here with ?creator=<id>). */
export default function ChatPage() {
  const creators = useCreators().data;
  const [initialId, setInitialId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the URL after mount
    setInitialId(new URLSearchParams(window.location.search).get("creator"));
  }, []);

  return (
    <>
      <PageHeader
        base="/brand"
        icon={MessageCircle}
        title="Chat"
        subtitle="Talk to the creators you work with"
      />
      <ChatView
        key={initialId ?? "none"}
        self="brand"
        initialId={initialId}
        contacts={creators?.map((c) => ({ id: c.id, label: c.display_name })) ?? null}
        emptyText={
          <>
            No creators yet. <Link href="/creators">Add or invite a creator</Link> to start
            chatting.
          </>
        }
      />
    </>
  );
}
