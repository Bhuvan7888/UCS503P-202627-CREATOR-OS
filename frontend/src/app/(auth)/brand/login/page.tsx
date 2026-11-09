"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import client from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { GradientPanel } from "@/components/GradientPanel";
import styles from "../../auth.module.css";

export default function BrandLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("DemoPass123!");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/auth/brand/login", {
        body: { email, password },
      });
      if (apiError || !data) {
        setError("That email and password combination doesn't match a brand account.");
      } else {
        saveSession(data);
        router.push("/brand");
      }
    } catch (err) {
      setError("Network error: Could not connect to the backend. If you are on Vercel, ensure NEXT_PUBLIC_API_URL is set to your deployed backend URL.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.formCol}>
        <Link href="/" className={styles.logo}>Creator OS</Link>
        <div className={styles.formBody}>
          <p className={styles.eyebrow}>Brand</p>
          <h1 className={styles.headline}>Sign in</h1>
          <p className={styles.subline}>
            New to Creator OS? <Link href="/brand/signup">Set up your brand</Link>
          </p>

          <div className={styles.demoSection}>
            <span className={styles.demoLabel}>Try a demo account</span>
            <div className={styles.demoButtons}>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.brand1@creatoros.dev")}>
                1. Mamaearth
              </button>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.brand2@creatoros.dev")}>
                2. boAt
              </button>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.brand3@creatoros.dev")}>
                3. Nykaa
              </button>
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
                placeholder="you@brand.com"
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
              <Link href="/creator/login" className={styles.linkMuted}>Sign in as a creator instead</Link>
            </div>
          </form>
        </div>
      </div>
      <GradientPanel className={styles.art} />
    </div>
  );
}
