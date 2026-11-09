"use client";

import React from "react";
import Link from "next/link";
import styles from "./landing.module.css";
import { GradientPanel } from "@/components/GradientPanel";

export default function LandingPage() {
  function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.announce}>Phase 1 &amp; 2 in active build · Phase 3 fully specified</div>

      <nav className={styles.nav}>
        <div className={styles.wrap + " " + styles.navInner}>
          <Link href="/" className={styles.logo}>Creator OS</Link>
          <div className={styles.navRight}>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className={styles.navLink}
            >
              How it works
            </a>

            <details className={styles.dropdown}>
              <summary>Log in</summary>
              <div className={styles.dropdownMenu}>
                <div className={styles.menuLabel}>Choose a role</div>
                <Link href="/brand/login">Brand</Link>
                <Link href="/creator/login">Creator</Link>
              </div>
            </details>

            <details className={`${styles.dropdown} ${styles.solid}`}>
              <summary>Sign up</summary>
              <div className={styles.dropdownMenu}>
                <div className={styles.menuLabel}>Choose a role</div>
                <Link href="/brand/signup">Brand</Link>
                <Link href="/creator/signup">Creator</Link>
              </div>
            </details>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>For brands &amp; creators, direct — no middleman</p>
          <h1 className={styles.headline}>
            Every deal, contract, and post — in <em>one place</em>
          </h1>
          <p className={styles.lede}>
            Creator OS calculates fair rates before a creator sends a counter-offer, reads a
            contract before anyone signs it, and scores a post before it goes out — three
            systems, built in that order, on top of each other&apos;s data.
          </p>
          <div className={styles.heroCtas}>
            <a
              href="#roles"
              onClick={(e) => scrollToSection(e, "roles")}
              className={styles.btnDark}
            >
              Get started ↓
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className={styles.btnGhost}
            >
              See how it works
            </a>
          </div>

          <GradientPanel className={styles.artStrip} />

          <div className={styles.roleGrid} id="roles">
            <div className={styles.roleCard}>
              <span className={styles.roleTag}>Brand</span>
              <div className={styles.roleTitle}>Run your campaigns</div>
              <p className={styles.roleDesc}>
                Deals, contracts, clause scanning, payments, and activity — one place instead
                of a hundred WhatsApp threads, direct with every creator.
              </p>
              <div className={styles.roleActions}>
                <Link href="/brand/login" className={styles.secondary}>Log in</Link>
                <Link href="/brand/signup" className={styles.primary}>Sign up</Link>
              </div>
            </div>

            <div className={styles.roleCard}>
              <span className={styles.roleTag}>Creator</span>
              <div className={styles.roleTitle}>Negotiate with data</div>
              <p className={styles.roleDesc}>
                Fair-rate ranges, a growth forecast, a pre-send checklist, and drafted
                scripts — negotiation lives inside your dashboard.
              </p>
              <div className={styles.roleActions}>
                <Link href="/creator/login" className={styles.secondary}>Log in</Link>
                <Link href="/creator/signup" className={styles.primary}>Sign up</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.phasesSection} id="how-it-works">
        <div className={styles.phases}>
          <div>
            <div className={styles.phaseNum}>01</div>
            <div className={styles.phaseTitle}>Foundation</div>
            <p className={styles.phaseDesc}>Onboarding, negotiation, contracts, deliverables, and payments — the deal lifecycle end to end.</p>
          </div>
          <div>
            <div className={styles.phaseNum}>02</div>
            <div className={styles.phaseTitle}>Trust layer</div>
            <p className={styles.phaseDesc}>Rule-based contract scanning flags risky clauses before anyone signs, with a human always deciding.</p>
          </div>
          <div>
            <div className={styles.phaseNum}>03</div>
            <div className={styles.phaseTitle}>Retention</div>
            <p className={styles.phaseDesc}>A content health score closes the loop between what was promised and what actually performed.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.wrap} style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>Creator OS</span>
          <div>
            <a href="mailto:support@creatoros.in">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
