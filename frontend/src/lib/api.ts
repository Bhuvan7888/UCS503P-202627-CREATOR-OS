import createClient from "openapi-fetch";
import type { paths } from "./api-types";
import { loadSession } from "./auth";

const client = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000" });

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

export default client;
