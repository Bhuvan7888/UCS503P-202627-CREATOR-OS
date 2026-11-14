import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import styles from "./shell.module.css";

interface PageHeaderProps {
  base: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Breadcrumb label; defaults to the title. */
  crumb?: string;
  actions?: React.ReactNode;
}

/** "Home > Page" breadcrumb, icon tile, title, subtitle and right-aligned actions. */
export function PageHeader({ base, icon: Icon, title, subtitle, crumb, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href={base}>Home</Link>
        <span aria-hidden>›</span>
        <span>{crumb ?? title}</span>
      </nav>
      <div className={styles.headRow}>
        <div className={styles.iconTile}>
          <Icon size={18} />
        </div>
        <div className={styles.headText}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {actions && <div className={styles.headActions}>{actions}</div>}
      </div>
    </header>
  );
}
