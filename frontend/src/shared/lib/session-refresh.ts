import { clearSession, loadSession, saveSession } from "@/shared/lib/session";

/**
 * Supabase sessions expire after about an hour. Before that, swap the session for a new one with its
 * refresh token (Supabase's /auth/v1/token endpoint). Refresh tokens are single-use, so only one refresh
 * runs at a time; concurrent callers share it.
 */
const REFRESH_MARGIN_SECONDS = 60;
let inFlight: Promise<string | null> | null = null;

function expiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null; // demo or malformed token: let the API decide
  }
}

export function isExpiringSoon(token: string): boolean {
  const exp = expiresAt(token);
  return exp !== null && exp - Date.now() / 1000 < REFRESH_MARGIN_SECONDS;
}

async function doRefresh(): Promise<string | null> {
  const session = loadSession();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!session?.refresh_token || !url || !anonKey) return null;
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return null;
    saveSession({ ...session, access_token: data.access_token, refresh_token: data.refresh_token });
    return data.access_token;
  } catch {
    return null;
  }
}

/** A fresh access token, or null when the session can't be renewed. */
export function refreshSession(): Promise<string | null> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** The session is gone for good: back to sign-in, with a short explanation. */
export function endExpiredSession(): void {
  const role = loadSession()?.role;
  clearSession();
  // a full page load on purpose: it drops every bit of in-memory state from the old session
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/${role === "brand" ? "brand" : "creator"}/login?expired=1`);
}
