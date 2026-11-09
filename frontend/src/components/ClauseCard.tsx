import React from "react";
import { StatusPill, StatusVariant } from "./StatusPill";
import { AlertCircle } from "lucide-react";

export interface ClauseCardProps {
  clauseText: string;
  flagColor: "red" | "yellow" | "green";
  flagReason?: string | null;
  llmExplanation?: string | null;
  escalationStatus?: string | null; // e.g., 'open', 'cleared', 'amended', 'rejected'
  onEscalate?: () => void;
  onResolve?: () => void;
}

export function ClauseCard({
  clauseText,
  flagColor,
  flagReason,
  llmExplanation,
  escalationStatus,
  onEscalate,
  onResolve
}: ClauseCardProps) {
  
  const getFlagVariant = (): StatusVariant => {
    switch (flagColor) {
      case "red": return "danger";
      case "yellow": return "warning";
      case "green": return "success";
      default: return "neutral";
    }
  };
  
  const getEscalationVariant = (): StatusVariant => {
    switch (escalationStatus) {
      case "open": return "warning";
      case "cleared": return "success";
      case "amended": return "accent";
      case "rejected": return "danger";
      default: return "neutral";
    }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] p-[var(--spacing-5)] flex flex-col gap-[var(--spacing-4)]">
      <div className="flex justify-between items-start gap-[var(--spacing-4)]">
        <div className="flex-1">
          <div className="flex items-center gap-[var(--spacing-2)] mb-[var(--spacing-2)]">
            <StatusPill status={`${flagColor.toUpperCase()} FLAG`} variant={getFlagVariant()} />
            {escalationStatus && (
              <StatusPill status={`Escalation: ${escalationStatus.toUpperCase()}`} variant={getEscalationVariant()} />
            )}
          </div>
          <p className="text-body text-[var(--color-ink)] italic border-l-2 border-[var(--color-border)] pl-[var(--spacing-3)] py-[var(--spacing-1)]">
            &quot;{clauseText}&quot;
          </p>
        </div>
        
        {flagColor !== "green" && !escalationStatus && onEscalate && (
          <button 
            onClick={onEscalate}
            className="text-small font-medium bg-[var(--color-danger)] text-white px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Escalate
          </button>
        )}
        {escalationStatus === "open" && onResolve && (
          <button 
            onClick={onResolve}
            className="text-small font-medium bg-[var(--color-accent)] text-white px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Resolve
          </button>
        )}
      </div>

      {(flagReason || llmExplanation) && (
        <div className={`rounded-[var(--radius-md)] p-[var(--spacing-4)] ${flagColor === "red" ? "bg-[var(--color-danger-soft)]" : "bg-[var(--color-warning-soft)]"}`}>
          {flagReason && (
            <div className="flex items-start gap-[var(--spacing-2)] mb-[var(--spacing-2)]">
              <AlertCircle size={18} className={flagColor === "red" ? "text-[var(--color-danger)] mt-0.5" : "text-[var(--color-warning)] mt-0.5"} />
              <p className="text-small font-semibold text-[var(--color-ink)]">{flagReason}</p>
            </div>
          )}
          {llmExplanation && (
            <p className="text-body text-[var(--color-ink-soft)] ml-[var(--spacing-6)]">
              {llmExplanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
