import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-[var(--spacing-8)] text-center w-full">
      <div className="mb-[var(--spacing-4)] text-[var(--color-ink-faint)]">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <p className="text-body text-[var(--color-ink-soft)] mb-[var(--spacing-4)] max-w-[300px]">
        {message}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-[var(--color-accent)] text-white px-[var(--spacing-4)] py-[var(--spacing-2)] rounded-[var(--radius-md)] text-body font-medium hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
