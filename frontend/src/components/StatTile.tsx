import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down" | "flat";
    text: string;
  };
  status?: "success" | "warning" | "danger" | "default";
}

export function StatTile({ label, value, trend, status = "default" }: StatTileProps) {
  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-[var(--color-success)]";
      case "warning":
        return "text-[var(--color-warning)]";
      case "danger":
        return "text-[var(--color-danger)]";
      default:
        return "text-[var(--color-ink-soft)]";
    }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-[var(--spacing-5)] flex flex-col gap-[var(--spacing-2)]">
      <h3 className="text-label text-[var(--color-ink-soft)]">{label}</h3>
      <div className="text-display text-[var(--color-ink)] tracking-tight">
        {value}
      </div>
      {trend && (
        <div className={`flex items-center gap-[var(--spacing-1)] text-small font-medium ${getStatusColor()}`}>
          {trend.direction === "up" && <TrendingUp size={16} strokeWidth={2} />}
          {trend.direction === "down" && <TrendingDown size={16} strokeWidth={2} />}
          {trend.direction === "flat" && <Minus size={16} strokeWidth={2} />}
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
}
