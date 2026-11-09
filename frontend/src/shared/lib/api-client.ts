import createClient from "openapi-fetch";
import type { paths } from "@/shared/lib/api-types";
import { loadSession } from "@/shared/lib/session";

/** Base URL of the FastAPI backend (set NEXT_PUBLIC_API_URL in production). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const client = createClient<paths>({ baseUrl: API_BASE_URL });

client.use({
  onRequest({ request }) {
    if (typeof window === "undefined") return request;
    const session = loadSession();
    if (session?.access_token) {
      request.headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return request;
  },
});

/**
 * POST to the API with the session's bearer token, for requests the typed client doesn't cover
 * (multipart uploads). When `file` is given it is sent as the multipart field "file".
 */
export function postWithSession(path: string, file?: File): Promise<Response> {
  const init: RequestInit = {
    method: "POST",
    headers: { Authorization: `Bearer ${loadSession()?.access_token ?? ""}` },
  };
  if (file) {
    const body = new FormData();
    body.append("file", file);
    init.body = body;
  }
  return fetch(`${API_BASE_URL}${path}`, init);
}

export default client;
