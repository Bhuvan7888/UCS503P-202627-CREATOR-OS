"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, MousePointerClick, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useWorkspace } from "@/features/workspaces";
import styles from "./ai-assist.module.css";

type SuggestionSet = components["schemas"]["SuggestionSet"];
type Suggestion = components["schemas"]["Suggestion"];

const INFO = [
  {
    icon: Sparkles,
    title: "Smart Analysis",
    text: "Uses your AI knowledge and your recent content to suggest ideas that fit your workspace.",
  },
  {
    icon: Layers,
    title: "Multi-Platform",
    text: "Each idea comes with the content type that suits it best — long-form, reels, posts and more.",
  },
  {
    icon: MousePointerClick,
    title: "One-Click Creation",
    text: "Press Create on any suggestion to add it to your Content Pipeline and start editing.",
  },
];

/** AI Content Suggestions: generate ideas, then turn one into a pipeline item or dismiss it. */
export default function AiSuggestionsPage() {
  const { workspace, base } = useWorkspace();
  const router = useRouter();
  const [set, setSet] = useState<SuggestionSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = { workspace: workspace.slug };

  useEffect(() => {
    client
      .GET("/workspaces/{workspace}/ai/suggestions", {
        params: { path: { workspace: workspace.slug } },
      })
      .then(({ data, error: apiError }) => {
        if (apiError || !data) setError("Couldn't load suggestions.");
        else setSet(data);
      });
  }, [workspace.slug]);

  async function generate() {
    setBusy(true);
    setError(null);
    const { data, error: apiError } = await client.POST(
      "/workspaces/{workspace}/ai/suggestions/refresh",
      {
        params: { path },
      },
    );
    setBusy(false);
    if (apiError || !data) {
      setError(
        typeof apiError?.detail === "string" ? apiError.detail : "Couldn't generate suggestions.",
      );
      return;
    }
    setSet(data);
  }

  async function dismiss(s: Suggestion) {
    const { data } = await client.POST(
      "/workspaces/{workspace}/ai/suggestions/{suggestion_id}/dismiss",
      {
        params: { path: { ...path, suggestion_id: s.id } },
      },
    );
    if (data) setSet(data);
  }

  async function create(s: Suggestion) {
    const { data, error: apiError } = await client.POST("/workspaces/{workspace}/content", {
      params: { path },
      body: {
        title: s.title,
        description: s.description,
        pillar: s.pillar,
        hook: s.hook,
        type: s.type,
        target_platforms: [],
      },
    });
    if (apiError || !data) {
      setError("Couldn't add that idea to your pipeline.");
      return;
    }
    await dismiss(s);
    router.push(`${base}/kanban?item=${data.id}`);
  }

  const visible = set?.suggestions.filter((s) => !s.dismissed) ?? [];
  const allDismissed = (set?.suggestions.length ?? 0) > 0 && visible.length === 0;

  return (
    <>
      <PageHeader
        base={base}
        icon={Sparkles}
        title="AI Content Suggestions"
        crumb="AI Suggestions"
        subtitle="Get AI-powered content ideas based on your workspace knowledge and recent content"
      />
      <p className={styles.note}>
        Already editing a specific piece of content? Open it on the board to generate its title,
        description and hook inline.
      </p>

      <div className={styles.infoGrid}>
        {INFO.map(({ icon: Icon, title, text }) => (
          <section key={title} className={styles.card}>
            <Icon size={18} />
            <h3>{title}</h3>
            <p>{text}</p>
          </section>
        ))}
      </div>

      <section className={styles.card} aria-label="Suggestions">
        <div className={styles.cardHead}>
          <h3>
            <Sparkles size={16} /> AI Content Suggestions
          </h3>
          {visible.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-row"
              onClick={generate}
              disabled={busy}
            >
              <RefreshCw size={14} /> {busy ? "Generating…" : "Generate New Suggestions"}
            </button>
          )}
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {set === null && !error && <p className={styles.muted}>Loading…</p>}
        {visible.length > 0 ? (
          <ul className={styles.suggestions}>
            {visible.map((s) => (
              <li key={s.id}>
                <div className={styles.grow}>
                  <strong>{s.title}</strong>
                  <p>{s.description}</p>
                  <small>
                    {s.pillar} · {s.type.replaceAll("_", " ")} · “{s.hook}”
                  </small>
                </div>
                <div className={styles.suggestionActions}>
                  <button type="button" className="btn btn-row" onClick={() => create(s)}>
                    <Plus size={14} /> Create
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-row"
                    onClick={() => dismiss(s)}
                    aria-label={`Dismiss ${s.title}`}
                  >
                    <X size={14} /> Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          set !== null && (
            <div className={styles.emptySuggestions}>
              <p>
                <strong>{allDismissed ? "All suggestions dismissed" : "No suggestions yet"}</strong>
              </p>
              <p className={styles.muted}>
                {allDismissed
                  ? "No more suggestions to show."
                  : "Generate a fresh set of ideas for this workspace."}
              </p>
              <button
                type="button"
                className="btn btn-outline btn-row"
                onClick={generate}
                disabled={busy}
              >
                <RefreshCw size={14} /> {busy ? "Generating…" : "Generate New Suggestions"}
              </button>
            </div>
          )
        )}
      </section>

      <section className={styles.card}>
        <h3>Tips for Better Suggestions</h3>
        <p className={styles.muted}>Improve the quality of AI-generated ideas</p>
        <ol className={styles.tips}>
          <li>
            <strong>Complete your workspace knowledge</strong>
            <span>
              Tell the AI about your brand, audience and strategy. The more context, the better the
              ideas.
            </span>
            <Link href={`${base}/settings/ai-knowledge`} className="btn btn-outline">
              Configure Knowledge
            </Link>
          </li>
          <li>
            <strong>Keep your pipeline up to date</strong>
            <span>
              Suggestions avoid repeating your recent content, so add what you are working on.
            </span>
          </li>
          <li>
            <strong>Refresh suggestions</strong>
            <span>
              Suggestions are kept for 24 hours. Generate a new set whenever you need more ideas.
            </span>
          </li>
        </ol>
      </section>
    </>
  );
}
