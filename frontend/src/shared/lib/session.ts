import type { components } from "@/shared/lib/api-types";
import { clearQueryCache } from "@/shared/lib/query-cache";

export type AuthSession = components["schemas"]["AuthSession"];

const STORAGE_KEY = "creatoros_session";

export function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(WORKSPACES_KEY);
  clearQueryCache(); // the next person in this tab must never see the previous person's data
}

/** Last known workspace list, so a page refresh can draw the shell before the API answers. */
export const WORKSPACES_KEY = "creatoros_workspaces";
