"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { MESSAGES_POLL_INTERVAL_MS } from "../constants/messages-polling";
import styles from "../chat.module.css";

type Message = components["schemas"]["Message"];
export interface ChatContact {
  id: string;
  label: string;
}

interface Props {
  /** null while loading. */
  contacts: ChatContact[] | null;
  /** Who is signed in — their messages are drawn on the right. */
  self: "brand" | "creator";
  /** Thread to open first (e.g. from a "Message" button); give the component a matching `key`. */
  initialId?: string | null;
  emptyText: React.ReactNode;
}

// ponytail: polls every 4s while a thread is open instead of a Supabase Realtime subscription — no
// client-side infra or RLS policy needed. Upgrade to Realtime if 4s latency ever matters.
/** Two-way brand ↔ creator chat: contact list, thread and composer. Used by both apps. */
export function ChatView({ contacts, self, initialId, emptyText }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(() => {
    client.GET("/messages/unread").then(({ data }) => {
      if (!data) return;
      setUnread(data.by_contact ?? {});
      // the sidebar's unread badge listens for this
      window.dispatchEvent(new Event("messagesUpdated"));
    });
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    function poll() {
      client.GET("/messages", { params: { query: { with_id: selectedId! } } }).then(({ data }) => {
        if (cancelled || !data) return;
        setMessages(data);
        fetchUnread();
      });
    }
    poll();
    const interval = setInterval(poll, MESSAGES_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId, fetchUnread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setBusy(true);
    setSendError(null);
    const { data, error } = await client.POST("/messages", {
      params: { query: { with_id: selectedId } },
      body: { body: draft.trim() },
    });
    setBusy(false);
    if (error || !data) return setSendError("Couldn't send that — try again.");
    setMessages((prev) => [...prev, data]);
    setDraft("");
  }

  if (contacts === null) return <p className={styles.placeholder}>Loading…</p>;
  if (contacts.length === 0) return <p className={styles.placeholder}>{emptyText}</p>;
  const selected = contacts.find((c) => c.id === selectedId);

  return (
    <div className={styles.layout}>
      <nav className={styles.contacts} aria-label="Conversations">
        {contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === selectedId ? styles.on : undefined}
            onClick={() => {
              setMessages([]);
              setSelectedId(c.id);
            }}
          >
            <span className={styles.name}>{c.label}</span>
            {!!unread[c.id] && c.id !== selectedId && (
              <span className="pill pill-bad">{unread[c.id]}</span>
            )}
          </button>
        ))}
      </nav>
      <section
        className={styles.thread}
        aria-label={selected ? `Chat with ${selected.label}` : "Chat"}
      >
        {!selected ? (
          <p className={styles.placeholder}>Pick a conversation to start chatting.</p>
        ) : (
          <>
            <div className={styles.messages}>
              {messages.length === 0 && (
                <p className={styles.placeholder}>No messages yet — say hello.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.bubble} ${m.sender_type === self ? styles.mine : ""}`}
                >
                  {m.body}
                  <small>
                    {new Date(m.created_at).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className={styles.composer} onSubmit={send}>
              <input
                className="field"
                placeholder={`Message ${selected.label}…`}
                value={draft}
                maxLength={4000}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Message"
              />
              <button className="btn btn-row" type="submit" disabled={busy || !draft.trim()}>
                <Send size={14} /> Send
              </button>
            </form>
            {sendError && <p className={styles.error}>{sendError}</p>}
          </>
        )}
      </section>
    </div>
  );
}
