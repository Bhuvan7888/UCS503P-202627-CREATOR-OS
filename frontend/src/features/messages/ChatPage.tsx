"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import client from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Message = components["schemas"]["Message"];
type Creator = components["schemas"]["Creator"];
type Brand = components["schemas"]["Brand"];

// ponytail: real-time via polling every 4s while a thread is open, not a
// Supabase Realtime subscription — no new client-side infra/RLS policy
// needed. Upgrade to Realtime if 4s latency ever matters.
const POLL_MS = 4000;

export default function ChatPage() {
  const [isBrand, setIsBrand] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<{ id: string; label: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  function fetchUnread() {
    client.GET("/messages/unread").then(({ data }) => {
      if (data) {
        setUnreadByContact(data.by_contact || {});
        window.dispatchEvent(new Event("messagesUpdated"));
      }
    });
  }

  useEffect(() => {
    const session = loadSession();
    const brand = session?.role === "brand";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see AppShell.tsx
    setIsBrand(brand);

    if (brand) {
      client.GET("/creators", { params: { query: { limit: 200 } } }).then(({ data }) => {
        setContacts((data ?? []).map((c: Creator) => ({ id: c.id, label: c.display_name })));
        fetchUnread();
      });
    } else {
      client.GET("/creators/me/brands").then(({ data }) => {
        setContacts((data ?? []).map((b: Brand) => ({ id: b.id, label: b.name })));
        fetchUnread();
      });
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    function poll() {
      client.GET("/messages", { params: { query: { with_id: selectedId! } } }).then(({ data }) => {
        if (!cancelled) {
          setMessages(data ?? []);
          fetchUnread();
        }
      });
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setBusy(true);
    setSendError("");
    const { data, error } = await client.POST("/messages", {
      params: { query: { with_id: selectedId } },
      body: { body: draft },
    });
    setBusy(false);
    if (error || !data) {
      setSendError("Couldn't send that — try again.");
      return;
    }
    setMessages((prev) => [...prev, data]);
    setDraft("");
    fetchUnread();
  }

  if (isBrand === null) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }
  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        message={isBrand ? "No creators yet. Onboard one from the Deals page to start chatting." : "You're not linked to any brands yet."}
      />
    );
  }

  const isMine = (m: Message) => (isBrand ? m.sender_type === "brand" : m.sender_type === "creator");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", height: "calc(100vh - 140px)" }}>
      <div className="mtile" style={{ overflowY: "auto", padding: "8px" }}>
        <div className="lbl" style={{ margin: "4px 6px 8px" }}>{isBrand ? "Creators" : "Brands"}</div>
        {contacts.map((c) => {
          const hasPending = (unreadByContact[c.id] || 0) > 0;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "12.5px",
                background: c.id === selectedId ? "var(--color-surface-sunken)" : "transparent",
                color: "var(--color-ink)",
                fontWeight: hasPending ? 600 : 400,
              }}
            >
              <span>{c.label}</span>
              {hasPending && (
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-danger, #C4351C)",
                    flexShrink: 0,
                    marginLeft: "8px",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mtile" style={{ display: "flex", flexDirection: "column", padding: "12px" }}>
        {!selectedId ? (
          <div style={{ margin: "auto", fontSize: "12.5px", color: "var(--color-ink-faint)" }}>
            Pick {isBrand ? "a creator" : "a brand"} to start chatting.
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "8px" }}>
              {messages.length === 0 && (
                <div style={{ margin: "auto", fontSize: "12.5px", color: "var(--color-ink-faint)" }}>No messages yet.</div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isMine(m) ? "flex-end" : "flex-start", maxWidth: "70%", fontSize: "12.5px",
                    background: isMine(m) ? "var(--color-ink)" : "var(--color-surface-sunken)",
                    color: isMine(m) ? "var(--color-surface)" : "var(--color-ink)",
                    borderRadius: isMine(m) ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                    padding: "8px 10px",
                  }}
                >
                  {m.body}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} style={{ display: "flex", gap: "8px" }}>
              <input
                className="field" style={{ flex: 1, margin: 0 }}
                value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="Message…"
              />
              <button className="btn" disabled={busy || !draft.trim()} type="submit">Send</button>
            </form>
            {sendError && <div style={{ fontSize: "11.5px", color: "var(--color-danger)", marginTop: "6px" }}>{sendError}</div>}
          </>
        )}
      </div>
    </div>
  );
}
