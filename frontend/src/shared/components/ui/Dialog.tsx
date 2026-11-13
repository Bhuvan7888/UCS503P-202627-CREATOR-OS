"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./Dialog.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name; shown as the heading unless `header` replaces it. */
  title: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}

/** Modal built on the native <dialog>: focus trap, Esc to close and the backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  header,
  footer,
  width = 640,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className={styles.frame}>
          <div className={styles.head}>
            {header ?? <h2 className={styles.title}>{title}</h2>}
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.foot}>{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
