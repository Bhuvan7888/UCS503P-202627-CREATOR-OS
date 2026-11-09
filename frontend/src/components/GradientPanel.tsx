import React from "react";
import styles from "./GradientPanel.module.css";

export function GradientPanel({ className }: { className?: string }) {
  return (
    <div className={`${styles.panel} ${className ?? ""}`} aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="gp-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
        </filter>
      </svg>
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />
      <div className={styles.grain} />
    </div>
  );
}
