"use client";

import React from "react";
import type { components } from "@/lib/api-types";

type NegotiationConversation = components["schemas"]["NegotiationConversation"];

interface NegotiationChatProps {
  brandLabel?: string;
  knownBrandName?: string;
  brandNameInput: string;
  onBrandNameChange: (v: string) => void;
  conversationText: string;
  onConversationTextChange: (v: string) => void;
  conversations: NegotiationConversation[];
  busy: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

// The AI negotiation chat — describe how things are going, get a suggestion
// back, and see the full back-and-forth history for this deal.
export function NegotiationChat({
  brandLabel, knownBrandName, brandNameInput, onBrandNameChange,
  conversationText, onConversationTextChange, conversations, busy, onSubmit,
}: NegotiationChatProps) {
  return (
    <div className="mtile">
      <div className="lbl" style={{ marginBottom: "8px" }}>
        Ask AI {brandLabel ? `about ${brandLabel}` : "about this negotiation"}
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-ink-soft)", marginBottom: "10px" }}>
        Chat with it about how things are going — it reads your rate range and the conversation history
        below, and will ask you a question back if it needs more context before advising.
      </div>

      {conversations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
          {[...conversations].reverse().map((c) => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{
                alignSelf: "flex-end", maxWidth: "85%", fontSize: "12.5px",
                background: "var(--color-ink)", color: "var(--color-surface)",
                borderRadius: "10px 10px 2px 10px", padding: "8px 10px",
              }}>
                {c.conversation_text}
              </div>
              {c.ai_suggestion && (
                <div style={{
                  alignSelf: "flex-start", maxWidth: "85%", fontSize: "12.5px",
                  background: "var(--color-surface-sunken)", color: "var(--color-ink)",
                  borderRadius: "10px 10px 10px 2px", padding: "8px 10px",
                }}>
                  {c.ai_suggestion}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "8px" }}>
        {!knownBrandName && conversations.length === 0 && (
          <label className="text-label">Brand name
            <input
              className="field" value={brandNameInput} onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="Who are you talking to?" required
            />
          </label>
        )}
        <label className="text-label">{conversations.length === 0 ? "Description — what's happened so far" : "Your message"}
          <textarea
            className="field" rows={conversations.length === 0 ? 4 : 2}
            value={conversationText} onChange={(e) => onConversationTextChange(e.target.value)}
            placeholder="e.g. They offered ₹15,000 for one reel, said budget is tight this quarter…"
            required
          />
        </label>
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Thinking…" : "Send"}
        </button>
      </form>
    </div>
  );
}
