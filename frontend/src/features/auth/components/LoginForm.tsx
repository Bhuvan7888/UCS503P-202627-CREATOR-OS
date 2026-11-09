"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import client from "@/shared/lib/api-client";
import { saveSession } from "@/shared/lib/session";
import { AuthPageFrame } from "./AuthPageFrame";
import { NETWORK_ERROR_MESSAGE } from "../constants/auth-messages";
import {
  DEMO_BRAND_ACCOUNTS,
  DEMO_CREATOR_ACCOUNTS,
  DEMO_PASSWORD,
  type DemoAccount,
} from "../constants/demo-accounts";
import styles from "../auth.module.css";

type Role = "brand" | "creator";

interface LoginCopy {
  eyebrow: string;
  signupPrompt: string;
  signupLinkText: string;
  emailPlaceholder: string;
  wrongCredentials: string;
  switchLinkText: string;
  demoAccounts: DemoAccount[];
}

const COPY: Record<Role, LoginCopy> = {
  brand: {
    eyebrow: "Brand",
    signupPrompt: "New to Creator OS?",
    signupLinkText: "Set up your brand",
    emailPlaceholder: "you@brand.com",
    wrongCredentials: "That email and password combination doesn't match a brand account.",
    switchLinkText: "Sign in as a creator instead",
    demoAccounts: DEMO_BRAND_ACCOUNTS,
  },
  creator: {
    eyebrow: "Creator",
    signupPrompt: "New here?",
    signupLinkText: "Create an account",
    emailPlaceholder: "you@example.com",
    wrongCredentials: "That email and password combination doesn't match a creator account.",
    switchLinkText: "Sign in as a brand instead",
    demoAccounts: DEMO_CREATOR_ACCOUNTS,
  },
};

/** Email/password login for brands and creators, with one-click demo-account fill. */
export function LoginForm({ role }: { role: Role }) {
  const copy = COPY[role];
  const otherRole: Role = role === "brand" ? "creator" : "brand";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const body = { email, password };
      const { data, error: apiError } =
        role === "brand"
          ? await client.POST("/auth/brand/login", { body })
          : await client.POST("/auth/creator/login", { body });
      if (apiError || !data) {
        setError(copy.wrongCredentials);
      } else {
        saveSession(data);
        router.push(`/${role}`);
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageFrame>
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      <h1 className={styles.headline}>Sign in</h1>
      <p className={styles.subline}>
        {`${copy.signupPrompt} `}
        <Link href={`/${role}/signup`}>{copy.signupLinkText}</Link>
      </p>

      <div className={styles.demoSection}>
        <span className={styles.demoLabel}>Try a demo account</span>
        <div className={styles.demoButtons}>
          {copy.demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className={styles.demoBtn}
              onClick={() => fillDemo(account.email)}
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className={styles.actionsRow}>
          <button type="submit" className={styles.btnPrimary} disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <Link href={`/${otherRole}/login`} className={styles.linkMuted}>
            {copy.switchLinkText}
          </Link>
        </div>
      </form>
    </AuthPageFrame>
  );
}
