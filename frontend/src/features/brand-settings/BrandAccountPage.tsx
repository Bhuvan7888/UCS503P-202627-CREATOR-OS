"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, LogOut } from "lucide-react";
import { clearSession, loadSession } from "@/shared/lib/session";
import page from "@/shared/components/shell/page.module.css";
import { BrandSettingsHeader } from "./components/BrandSettingsHeader";

/** Brand Settings → Account: the invite code creators use to connect, and signing out. */
export default function BrandAccountPage() {
  const router = useRouter();
  const [brand, setBrand] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = loadSession();
    // localStorage is client-only
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrand({ name: s?.brand_name ?? "Brand", code: s?.brand_id ?? "" });
  }, []);

  function copy() {
    if (!brand) return;
    navigator.clipboard.writeText(brand.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function signOut() {
    clearSession();
    router.push("/brand/login");
  }

  return (
    <>
      <BrandSettingsHeader tab="Account" />
      <div className={page.stack}>
        <section className={page.card}>
          <h2>Invite code</h2>
          <p className={page.cardSub}>
            Creators on Creator OS enter this in their workspace under Settings → Brands to connect
            with {brand?.name ?? "you"}. Connected creators can chat with you and see your deals.
          </p>
          <div className={page.row}>
            <code className={page.code}>{brand?.code || "—"}</code>
            <button type="button" className="btn btn-outline btn-row" onClick={copy}>
              <Copy size={14} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>
        <section className={page.card}>
          <h2>Account</h2>
          <p className={page.cardSub}>
            Signed in as the brand account for <strong>{brand?.name ?? "…"}</strong>.
          </p>
          <button type="button" className="btn btn-outline btn-row" onClick={signOut}>
            <LogOut size={14} /> Sign out
          </button>
        </section>
      </div>
    </>
  );
}
