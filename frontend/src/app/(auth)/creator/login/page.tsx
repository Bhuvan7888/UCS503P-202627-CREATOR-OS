"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import client from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { GradientPanel } from "@/components/GradientPanel";
import styles from "../../auth.module.css";

export default function CreatorLoginPage() {
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
      const { data, error: apiError } = await client.POST("/auth/creator/login", {
        body: { email, password },
      });
      if (apiError || !data) {
        setError("That email and password combination doesn't match a creator account.");
      } else {
        saveSession(data);
        router.push("/creator");
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
          <p className={styles.eyebrow}>Creator</p>
          <h1 className={styles.headline}>Sign in</h1>
          <p className={styles.subline}>
            New here? <Link href="/creator/signup">Create an account</Link>
          </p>

          <div className={styles.demoSection}>
            <span className={styles.demoLabel}>Try a demo account</span>
            <div className={styles.demoButtons}>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.creator1@creatoros.dev")}>
                1. Ananya Sharma (Mamaearth, Nykaa)
              </button>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.creator2@creatoros.dev")}>
                2. Rohan Mehta (Mamaearth)
              </button>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.creator3@creatoros.dev")}>
                3. Zara Khan (Nykaa)
              </button>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.creator4@creatoros.dev")}>
                4. Kabir Anand (boAt)
              </button>
              <button type="button" className={styles.demoBtn} onClick={() => fillDemo("demo.creator5@creatoros.dev")}>
                5. Ishita Rao (boAt)
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
                placeholder="you@example.com"
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
              <Link href="/brand/login" className={styles.linkMuted}>Sign in as a brand instead</Link>
            </div>
          </form>
        </div>
      </div>
      <GradientPanel className={styles.art} />
    </div>
  );
}
