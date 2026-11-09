import React from "react";
import Link from "next/link";
import { GradientPanel } from "@/shared/components/ui/GradientPanel";
import styles from "../auth.module.css";

/** Two-column layout shared by every login/sign-up screen: form on the left, gradient art on the right. */
export function AuthPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.formCol}>
        <Link href="/" className={styles.logo}>Creator OS</Link>
        <div className={styles.formBody}>{children}</div>
      </div>
      <GradientPanel className={styles.art} />
    </div>
  );
}
