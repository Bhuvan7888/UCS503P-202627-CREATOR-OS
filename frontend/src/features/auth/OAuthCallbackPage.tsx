"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import client from "@/shared/lib/api-client";
import { clearSession, saveSession } from "@/shared/lib/session";
import { AuthPageFrame } from "./components/AuthPageFrame";
import { NETWORK_ERROR_MESSAGE } from "./constants/auth-messages";
import styles from "./auth.module.css";

/** Landing page after Google sign-in: hands the Supabase session to the backend, then opens the workspace. */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    // drop the tokens from the address bar and history
    window.history.replaceState(null, "", window.location.pathname);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    // a new sign-in replaces whatever session this browser had before
    clearSession();
    if (!accessToken || !refreshToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the redirect URL
      setError(
        params.get("error_description") ?? "Google sign-in didn't complete. Please try again.",
      );
      return;
    }
    client
      .POST("/auth/creator/oauth", {
        body: { refresh_token: refreshToken },
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(({ data, error: apiError }) => {
        if (apiError || !data) {
          setError(
            typeof apiError?.detail === "string" ? apiError.detail : "Couldn't finish signing in.",
          );
          return;
        }
        saveSession(data);
        router.replace("/dashboard");
      })
      .catch(() => setError(NETWORK_ERROR_MESSAGE));
  }, [router]);

  return (
    <AuthPageFrame>
      <h1 className={styles.headline}>{error ? "Sign-in failed" : "Signing you in…"}</h1>
      {error && (
        <>
          <div className={styles.error}>{error}</div>
          <Link href="/creator/login" className={styles.linkMuted}>
            Back to sign in
          </Link>
        </>
      )}
    </AuthPageFrame>
  );
}
