"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { useGenerate, type ContentDraft, type GenerateField } from "../hooks/useGenerate";
import styles from "../ai-assist.module.css";

interface Props {
  workspace: string;
  field: GenerateField;
  label: string;
  draft: ContentDraft;
  onText: (text: string) => void;
}

/** "✨ Generate Title" style button; the result goes into the field for the user to edit. */
export function GenerateButton({ workspace, field, label, draft, onText }: Props) {
  const { generate, busy, error } = useGenerate(workspace);

  async function run() {
    const text = await generate(field, draft);
    if (text) onText(text);
  }

  return (
    <span className={styles.generate}>
      <button type="button" className={styles.generateBtn} onClick={run} disabled={busy}>
        <Sparkles size={13} /> {busy ? "Generating…" : label}
      </button>
      {error && (
        <span className={styles.generateError} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
