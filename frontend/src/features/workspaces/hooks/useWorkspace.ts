"use client";

import { createContext, useContext } from "react";
import type { components } from "@/shared/lib/api-types";

export type MyWorkspace = components["schemas"]["MyWorkspace"];

export interface WorkspaceContextValue {
  workspace: MyWorkspace;
  /** Route prefix of the active workspace, e.g. /dashboard/ws-1a2b3c4d */
  base: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** The active workspace. Only valid inside the workspace shell (src/app/dashboard/[workspace]). */
export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside the workspace shell");
  return value;
}
