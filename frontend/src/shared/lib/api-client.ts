import createClient from "openapi-fetch";
import type { paths } from "@/shared/lib/api-types";
import { loadSession } from "@/shared/lib/session";
import { endExpiredSession, isExpiringSoon, refreshSession } from "@/shared/lib/session-refresh";

/** Base URL of the FastAPI backend (set NEXT_PUBLIC_API_URL in production). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const client = createClient<paths>({ baseUrl: API_BASE_URL });
// Copies of requests that carry the stored session, so one can be retried after a refresh.
const retryable = new WeakMap<Request, Request>();

client.use({
  async onRequest({ request }) {
    if (typeof window === "undefined") return request;
    // A request that names its own token (e.g. the Google sign-in callback) keeps it.
    if (request.headers.has("Authorization")) return request;
    const session = loadSession();
    if (!session?.access_token) return request;
    const token = isExpiringSoon(session.access_token)
      ? ((await refreshSession()) ?? session.access_token)
      : session.access_token;
    request.headers.set("Authorization", `Bearer ${token}`);
    retryable.set(request, request.clone());
    return request;
  },
  async onResponse({ request, response }) {
    const original = retryable.get(request);
    if (response.status !== 401 || !original) return response;
    const token = await refreshSession();
    if (!token) {
      endExpiredSession();
      return response;
    }
    const retry = new Request(original, { headers: new Headers(original.headers) });
    retry.headers.set("Authorization", `Bearer ${token}`);
    return fetch(retry);
  },
});

/**
 * POST to the API with the session's bearer token, for requests the typed client doesn't cover
 * (multipart uploads). When `file` is given it is sent as the multipart field "file".
 */
export async function postWithSession(path: string, file?: File): Promise<Response> {
  const stored = loadSession()?.access_token ?? "";
  const token = stored && isExpiringSoon(stored) ? ((await refreshSession()) ?? stored) : stored;
  const init: RequestInit = {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  };
  if (file) {
    const body = new FormData();
    body.append("file", file);
    init.body = body;
  }
  return fetch(`${API_BASE_URL}${path}`, init);
}

export default client;
