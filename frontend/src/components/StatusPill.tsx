import React from "react";

export type StatusVariant = "success" | "warning" | "danger" | "neutral" | "accent";

interface StatusPillProps {
  status: string;
  variant: StatusVariant;
}

export function StatusPill({ status, variant }: StatusPillProps) {
  const getStyles = () => {
    switch (variant) {
      case "success":
        return "bg-[var(--color-success-soft)] text-[var(--color-success)]";
      case "warning":
        return "bg-[var(--color-warning-soft)] text-[var(--color-warning)]";
      case "danger":
        return "bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
      case "accent":
        return "bg-[var(--color-accent-soft)] text-[var(--color-accent)]";
      default:
        return "bg-[var(--color-surface-sunken)] text-[var(--color-ink)]";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-label rounded-[var(--radius-pill)] ${getStyles()}`}
    >
      {status}
    </span>
  );
}
