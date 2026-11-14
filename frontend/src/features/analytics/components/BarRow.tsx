import React from "react";

export function BarRow({
  label,
  value,
  max,
  color,
  format = String,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  format?: (value: number) => string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr auto",
        gap: "8px",
        alignItems: "center",
        fontSize: "12px",
      }}
    >
      <div style={{ color: "var(--color-ink-soft)" }}>{label}</div>
      <div
        style={{
          background: "var(--color-surface-sunken)",
          borderRadius: "4px",
          height: "10px",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px" }} />
      </div>
      <div style={{ fontWeight: 600, minWidth: "70px", textAlign: "right" }}>{format(value)}</div>
    </div>
  );
}
