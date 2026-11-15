"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import client from "@/shared/lib/api-client";
import { errorText } from "@/shared/lib/api-error";
import type { components } from "@/shared/lib/api-types";
import page from "@/shared/components/shell/page.module.css";

type Match = components["schemas"]["CreatorMatch"];

/** Creators page: describe a campaign, AI ranks your roster by fit with a reason for each. */
export function CreatorMatchCard() {
  const [campaign, setCampaign] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: apiError } = await client.POST("/brand-ai/match", {
      body: { campaign: campaign.trim() },
    });
    setBusy(false);
    if (!data) return setError(errorText(apiError, "Couldn't find matches."));
    setMatches(data.matches);
  }

  return (
    <section className={`${page.card} ${page.spaced}`}>
      <h2>Find the right creator with AI</h2>
      <p className={page.cardSub}>
        Describe the campaign. AI ranks your creators by fit using your AI knowledge from Settings,
        their real track record with you on Creator OS, and their stats — which creators report
        themselves, so matches on missing or old numbers are marked low confidence.
      </p>
      <form className={page.inlineForm} onSubmit={find}>
        <label>
          Campaign idea
          <input
            className="field"
            value={campaign}
            minLength={10}
            maxLength={2000}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="e.g. Launch of our vitamin C serum for oily skin, reels for 18–25s"
          />
        </label>
        <button
          className="btn btn-row"
          type="submit"
          disabled={busy || campaign.trim().length < 10}
        >
          <Sparkles size={14} /> {busy ? "Matching…" : "Find matches"}
        </button>
      </form>
      {error && (
        <p className={page.errorBox} role="alert">
          {error}
        </p>
      )}
      {matches && (
        <ul className={page.list} aria-label="Creator matches">
          {matches.length === 0 && <li className={page.muted}>No good matches on your roster.</li>}
          {matches.map((m) => (
            <li key={m.creator_id}>
              <span className="pill pill-neu" aria-label={`Fit ${m.score} out of 100`}>
                {m.score}
              </span>
              <span className={page.grow}>
                <span className={page.row}>
                  <Link href={`/creators/${m.creator_id}`}>{m.display_name}</Link>
                  {m.confidence === "low" && (
                    <span className="pill pill-warn" title={m.data_note}>
                      Low confidence
                    </span>
                  )}
                </span>
                <small>{m.reason}</small>
                <small>
                  On Creator OS: {m.track_record} · {m.data_note}
                </small>
              </span>
              <Link href={`/deals?new=1&creator=${m.creator_id}`} className="btn btn-text btn-row">
                <Plus size={14} /> Start deal
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
