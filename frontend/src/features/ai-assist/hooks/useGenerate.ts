"use client";

import { useState } from "react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";

export type ContentDraft = components["schemas"]["ContentDraft"];
export type GenerateField = components["schemas"]["GenerateRequest"]["field"];

/** Calls the workspace AI to write one field from the draft typed so far. */
export function useGenerate(workspace: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(field: GenerateField, draft: ContentDraft): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/workspaces/{workspace}/ai/generate", {
        params: { path: { workspace } },
        body: { field, draft },
      });
      if (apiError || !data) {
        setError(
          typeof apiError?.detail === "string" ? apiError.detail : "Couldn't generate that.",
        );
        return null;
      }
      return data.text;
    } catch {
      setError("Couldn't reach the server. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { generate, busy, error };
}
