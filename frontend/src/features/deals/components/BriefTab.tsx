"use client";

import React, { useEffect, useState } from "react";
import { Save, Send, Sparkles } from "lucide-react";
import client from "@/shared/lib/api-client";
import { errorText } from "@/shared/lib/api-error";
import { useQuery } from "@/shared/lib/query-cache";
import page from "@/shared/components/shell/page.module.css";

interface Props {
  dealId: string;
  creatorId: string;
  creatorName: string;
}

/** Deal page → Brief: write the campaign brief (or let AI draft it), save it, send it to the creator. */
export function BriefTab({ dealId, creatorId, creatorName }: Props) {
  const brief = useQuery(
    `brand:brief:${dealId}`,
    async () =>
      (
        await client.GET("/brand-ai/deals/{deal_id}/brief", {
          params: { path: { deal_id: dealId } },
        })
      ).data,
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"generate" | "save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // show the saved brief once it loads (the API answers null when there is none yet)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (brief.data) setText(brief.data.content);
  }, [brief.data]);

  async function act(kind: "generate" | "save" | "send", run: () => Promise<string | null>) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    const failure = await run().catch(() => "Something went wrong — try again.");
    setBusy(null);
    if (failure) setError(failure);
  }

  const generate = () =>
    act("generate", async () => {
      const { data, error: e } = await client.POST("/brand-ai/deals/{deal_id}/brief/generate", {
        params: { path: { deal_id: dealId } },
      });
      if (!data) return errorText(e, "Couldn't draft the brief.");
      setText(data.text);
      setNotice("AI draft ready — review it, edit anything, then save.");
      return null;
    });

  async function persist(): Promise<string | null> {
    const { data, error: e } = await client.PUT("/brand-ai/deals/{deal_id}/brief", {
      params: { path: { deal_id: dealId } },
      body: { content: text },
    });
    if (!data) return errorText(e, "Couldn't save the brief.");
    brief.mutate(() => data);
    return null;
  }

  const save = () =>
    act("save", async () => {
      const failure = await persist();
      if (!failure) setNotice("Brief saved.");
      return failure;
    });

  const send = () =>
    act("send", async () => {
      const failure = await persist();
      if (failure) return failure;
      const { error: e } = await client.POST("/messages", {
        params: { query: { with_id: creatorId } },
        body: { body: `Campaign brief\n\n${text.trim()}` },
      });
      if (e) return errorText(e, "Saved, but couldn't send it in Chat.");
      setNotice(`Saved and sent to ${creatorName} in Chat.`);
      return null;
    });

  const empty = !text.trim();
  return (
    <section className={page.card}>
      <div className={page.cardHead}>
        <div>
          <h2>Campaign brief</h2>
          <p className={page.cardSub}>
            What {creatorName} needs to know. AI drafts it from your brand&apos;s AI knowledge
            (Settings), this deal and the creator&apos;s profile.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-row"
          onClick={generate}
          disabled={busy !== null}
        >
          <Sparkles size={14} /> {busy === "generate" ? "Drafting…" : "Draft with AI"}
        </button>
      </div>
      {error && (
        <p className={page.errorBox} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={page.notice} role="status">
          {notice}
        </p>
      )}
      <textarea
        className="field"
        rows={16}
        maxLength={20000}
        aria-label="Campaign brief"
        placeholder={
          brief.data === undefined ? "Loading…" : "Overview, objective, key messages, deliverables…"
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={page.inlineForm}>
        <button
          className="btn btn-row"
          type="button"
          onClick={save}
          disabled={busy !== null || empty}
        >
          <Save size={14} /> {busy === "save" ? "Saving…" : "Save brief"}
        </button>
        <button
          className="btn btn-outline btn-row"
          type="button"
          onClick={send}
          disabled={busy !== null || empty}
        >
          <Send size={14} /> {busy === "send" ? "Sending…" : `Send to ${creatorName}`}
        </button>
        {brief.data && (
          <span className={page.muted}>
            Last saved {new Date(brief.data.updated_at).toLocaleString()}
          </span>
        )}
      </div>
    </section>
  );
}
