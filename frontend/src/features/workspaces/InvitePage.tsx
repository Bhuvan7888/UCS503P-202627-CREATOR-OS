"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { clearSession, loadSession } from "@/shared/lib/session";
import { ROLE_INFO } from "./constants/permissions";
import { PENDING_INVITE_KEY } from "./constants/nav";
import styles from "./invite.module.css";

type Preview = components["schemas"]["InvitePreview"];

/** /invite/[token]: join a workspace. Signed-out visitors sign in first and come back here. */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = loadSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the session lives in localStorage
    setSignedIn(Boolean(session));
    if (!session) {
      // /dashboard sends the user back here after sign-in or sign-up
      localStorage.setItem(PENDING_INVITE_KEY, token);
      return;
    }
    localStorage.removeItem(PENDING_INVITE_KEY);
    client.GET("/invites/{token}", { params: { path: { token } } }).then(({ data, error: e }) => {
      if (e || !data)
        setError(typeof e?.detail === "string" ? e.detail : "This invitation link is not valid.");
      else setPreview(data);
    });
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    const { data, error: e } = await client.POST("/invites/{token}/accept", {
      params: { path: { token } },
    });
    setBusy(false);
    if (e || !data)
      return setError(typeof e?.detail === "string" ? e.detail : "Couldn't join the workspace.");
    router.replace(`/dashboard/${data.slug}`);
  }

  function switchAccount() {
    clearSession();
    localStorage.setItem(PENDING_INVITE_KEY, token);
    router.push("/creator/login");
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.brand}>Creator OS</p>
        {signedIn === false && (
          <>
            <h1>You&apos;ve been invited to a workspace</h1>
            <p>Sign in, or create an account, with the email address the invitation was sent to.</p>
            <div className={styles.actions}>
              <Link href="/creator/login" className="btn">
                Sign in
              </Link>
              <Link href="/creator/signup" className="btn btn-outline">
                Create an account
              </Link>
            </div>
          </>
        )}
        {signedIn && preview && (
          <>
            <h1>Join {preview.workspace_name}</h1>
            <p>
              You&apos;re invited as <strong>{ROLE_INFO[preview.role].label}</strong> (
              {ROLE_INFO[preview.role].description}). The invitation is for{" "}
              <strong>{preview.email}</strong>.
            </p>
            {preview.accepted || preview.expired ? (
              <p className={styles.error}>
                This invitation has {preview.accepted ? "already been used" : "expired"}. Ask for a
                new one.
              </p>
            ) : (
              <div className={styles.actions}>
                <button type="button" className="btn" disabled={busy} onClick={accept}>
                  {busy ? "Joining…" : "Accept invitation"}
                </button>
                <Link href="/dashboard" className="btn btn-outline">
                  Not now
                </Link>
              </div>
            )}
          </>
        )}
        {signedIn && !preview && !error && <p>Checking your invitation…</p>}
        {error && (
          <>
            <p className={styles.error} role="alert">
              {error}
            </p>
            <button type="button" className="btn btn-outline" onClick={switchAccount}>
              Sign in with a different account
            </button>
          </>
        )}
      </div>
    </main>
  );
}
