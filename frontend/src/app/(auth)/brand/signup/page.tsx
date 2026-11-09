"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import client from "@/lib/api";
import { saveSession, type AuthSession } from "@/lib/auth";
import { GradientPanel } from "@/components/GradientPanel";
import styles from "../../auth.module.css";

export default function BrandSignupPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);


    try {
      const { data, error: apiError } = await client.POST("/auth/brand/signup", {
        body: { brand_name: brandName, description: description || null, email, password },
      });
      if (apiError || !data) {
        const msg = typeof apiError?.detail === 'string' ? apiError.detail : "Could not create account";
        setError(msg);
      } else {
        saveSession(data);
        setSession(data);
      }
    } catch (err) {
      setError("Network error: Could not connect to the backend. If you are on Vercel, ensure NEXT_PUBLIC_API_URL is set to your deployed backend URL.");
    } finally {
      setPending(false);
    }
  }

  if (session) {
    return (
      <div className={styles.wrap}>
        <div className={styles.formCol}>
          <Link href="/" className={styles.logo}>Creator OS</Link>
          <div className={styles.formBody}>
            <p className={styles.eyebrow}>Brand</p>
            <h1 className={styles.headline}>You&apos;re in</h1>
            <p className={styles.subline}>
              {session.brand_name} is ready. Share this invite code with creators so they can join your brand.
            </p>
            <div className={styles.field}>
              <label>Invite code</label>
              <input readOnly value={session.brand_id ?? ""} onFocus={(e) => e.target.select()} />
            </div>
            <div className={styles.actionsRow}>
              <button className={styles.btnPrimary} onClick={() => router.push("/brand")}>
                Continue to dashboard
              </button>
            </div>
          </div>
        </div>
        <GradientPanel className={styles.art} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.formCol}>
        <Link href="/" className={styles.logo}>Creator OS</Link>
        <div className={styles.formBody}>
          <p className={styles.eyebrow}>Brand</p>
          <h1 className={styles.headline}>Set up your brand</h1>
          <p className={styles.subline}>
            Already have an account? <Link href="/brand/login">Sign in</Link>
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={onSubmit}>
            <div className={styles.field}>
              <label htmlFor="brandName">Brand name</label>
              <input
                id="brandName"
                required
                placeholder="e.g. North Star Talent"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="description">What does your brand do? (optional)</label>
              <input
                id="description"
                placeholder="e.g. DTC skincare brand running creator gifting + paid campaigns"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
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
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className={styles.actionsRow}>
              <button type="submit" className={styles.btnPrimary} disabled={pending}>
                {pending ? "Creating account…" : "Create brand account"}
              </button>
              <Link href="/creator/signup" className={styles.linkMuted}>I&apos;m a creator</Link>
            </div>
          </form>
        </div>
      </div>
      <GradientPanel className={styles.art} />
    </div>
  );
}
