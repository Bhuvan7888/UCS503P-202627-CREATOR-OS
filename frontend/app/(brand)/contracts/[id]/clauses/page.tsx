"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, ShieldAlert } from "lucide-react";
import client from "@/lib/api";
import { ClauseCard } from "@/components/ClauseCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill, StatusVariant } from "@/components/StatusPill";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Contract = components["schemas"]["Contract"];
type ClauseCardOut = components["schemas"]["ClauseCardOut"];

interface Highlight {
  start: number;
  end: number;
  flag: "red" | "yellow";
  reason: string | null;
}

function variantFor(status: string): StatusVariant {
  switch (status) {
    case "signed": return "success";
    case "pending_review": return "warning";
    case "void": return "danger";
    default: return "neutral";
  }
}

function findHighlights(fullText: string, clauses: ClauseCardOut[]): Highlight[] {
  const ranges: Highlight[] = [];
  for (const c of clauses) {
    if (c.flag === "green") continue;
    const trimmed = c.raw_text.trim();
    if (!trimmed) continue;
    const pattern = trimmed
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    try {
      const match = fullText.match(new RegExp(pattern));
      if (match && match.index !== undefined) {
        ranges.push({ start: match.index, end: match.index + match[0].length, flag: c.flag, reason: c.flag_reason_code ?? null });
      }
    } catch {
      // Ignore regex issues
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  for (const r of ranges) {
    if (merged.length && r.start < merged[merged.length - 1].end) continue;
    merged.push(r);
  }
  return merged;
}

function HighlightedText({ fullText, clauses }: { fullText: string; clauses: ClauseCardOut[] }) {
  const highlights = findHighlights(fullText, clauses);
  if (highlights.length === 0) {
    return <>{fullText}</>;
  }
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  highlights.forEach((h, i) => {
    if (h.start > cursor) nodes.push(<span key={`t${i}`}>{fullText.slice(cursor, h.start)}</span>);
    nodes.push(
      <mark
        key={`h${i}`}
        title={h.reason ?? undefined}
        style={{
          background: h.flag === "red" ? "var(--color-danger-soft)" : "var(--color-warning-soft)",
          color: h.flag === "red" ? "var(--color-danger)" : "var(--color-warning)",
          padding: "1px 3px",
          borderRadius: "3px",
          fontWeight: 500,
        }}
      >
        {fullText.slice(h.start, h.end)}
      </mark>
    );
    cursor = h.end;
  });
  if (cursor < fullText.length) nodes.push(<span key="tail">{fullText.slice(cursor)}</span>);
  return <>{nodes}</>;
}

export default function ContractView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [clauses, setClauses] = useState<ClauseCardOut[]>([]);
  const [error, setError] = useState(false);
  const [isBrand, setIsBrand] = useState(false);
  const [viewMode, setViewMode] = useState<"flags" | "clean">("flags");

  useEffect(() => {
    const brand = loadSession()?.role === "brand";
    setIsBrand(brand);
    if (brand) {
      setViewMode("clean");
    }

    Promise.all([
      client.GET("/contracts/{id}", { params: { path: { id } } }),
      client.GET("/contracts/{contract_id}/clauses", { params: { path: { contract_id: id } } }),
    ]).then(([contractRes, clausesRes]) => {
      if (contractRes.error) { setError(true); return; }
      setContract(contractRes.data ?? null);
      setClauses(clausesRes.data ?? []);
    });
  }, [id]);

  if (error) {
    return <EmptyState icon={FileText} message="Couldn't load this contract. Try signing in again." />;
  }
  if (contract === undefined) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }
  if (!contract) {
    return <EmptyState icon={FileText} message="Contract not found." />;
  }

  // --- 1. BRAND VIEW: Clean contract document without any flagging feature ---
  if (isBrand) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", paddingBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <Link
            href="/contracts"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "var(--color-ink-soft)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={15} /> Back to contracts
          </Link>
          <StatusPill status={contract.status.replace(/_/g, " ")} variant={variantFor(contract.status)} />
        </div>

        <div className="mtile" style={{ padding: "28px 32px" }}>
          <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
              Contract Agreement
            </h1>
            <p style={{ fontSize: "12px", color: "var(--color-ink-faint)", marginTop: "4px" }}>
              Uploaded on {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>

          {contract.raw_text ? (
            <div
              style={{
                fontSize: "13.5px",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                color: "var(--color-ink)",
              }}
            >
              {contract.raw_text}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "var(--color-ink-faint)", padding: "24px 0", textAlign: "center" }}>
              Full text is not available for this contract.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 2. CREATOR VIEW: Flagging protection feature with option to toggle clean view ---
  const flaggedClauses = clauses.filter((c) => c.flag === "red" || c.flag === "yellow");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/contracts"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "var(--color-ink-soft)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={15} /> Back to contracts
          </Link>
          <StatusPill status={contract.status.replace(/_/g, " ")} variant={variantFor(contract.status)} />
        </div>

        {/* Option to toggle between Flagged Review and Clean Contract View */}
        <div style={{ display: "flex", background: "var(--color-surface-sunken)", padding: "3px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <button
            type="button"
            style={{
              border: "none",
              background: viewMode === "flags" ? "var(--color-surface)" : "transparent",
              color: viewMode === "flags" ? "var(--color-ink)" : "var(--color-ink-faint)",
              padding: "5px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: viewMode === "flags" ? "var(--shadow-sm)" : "none",
            }}
            onClick={() => setViewMode("flags")}
          >
            🚩 Flagged Clauses Review {flaggedClauses.length > 0 ? `(${flaggedClauses.length})` : ""}
          </button>
          <button
            type="button"
            style={{
              border: "none",
              background: viewMode === "clean" ? "var(--color-surface)" : "transparent",
              color: viewMode === "clean" ? "var(--color-ink)" : "var(--color-ink-faint)",
              padding: "5px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: viewMode === "clean" ? "var(--shadow-sm)" : "none",
            }}
            onClick={() => setViewMode("clean")}
          >
            📄 Clean Contract View
          </button>
        </div>
      </div>

      {viewMode === "clean" ? (
        <div className="mtile" style={{ maxWidth: "840px", margin: "0 auto", width: "100%", padding: "28px 32px" }}>
          <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "12px", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
              Contract Agreement
            </h1>
            <p style={{ fontSize: "12px", color: "var(--color-ink-faint)", marginTop: "4px" }}>
              Uploaded on {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>

          {contract.raw_text ? (
            <div style={{ fontSize: "13.5px", lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--color-ink)" }}>
              {contract.raw_text}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "var(--color-ink-faint)", padding: "24px 0", textAlign: "center" }}>
              Full text is not available for this contract.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "16px" }}>
          <div className="mtile" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "20px" }}>
            <div className="lbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Full contract text</span>
              {flaggedClauses.length > 0 && (
                <span style={{ fontSize: "11px", color: "var(--color-danger)", fontWeight: 500 }}>
                  Highlights indicate detected risks
                </span>
              )}
            </div>
            {contract.raw_text ? (
              <div style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: "70vh", overflowY: "auto" }}>
                <HighlightedText fullText={contract.raw_text} clauses={clauses} />
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>
                Full text isn&apos;t available for this contract.
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="lbl">Flagged clauses</div>
              {flaggedClauses.length === 0 ? (
                <div
                  className="mtile"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    borderLeft: "4px solid var(--color-success)",
                  }}
                >
                  <CheckCircle2 size={20} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-ink)" }}>
                      No Risky Clauses Detected
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-ink-soft)", marginTop: "2px" }}>
                      All clauses passed standard creator protection checks.
                    </div>
                  </div>
                </div>
              ) : (
                flaggedClauses.map((clause) => (
                  <ClauseCard
                    key={clause.id}
                    clauseText={clause.raw_text}
                    flagColor={clause.flag}
                    flagReason={clause.flag_reason_code}
                    llmExplanation={clause.llm_explanation}
                  />
                ))
              )}
            </div>

            <div className="mtile" style={{ padding: "16px" }}>
              <div className="lbl" style={{ marginBottom: "6px" }}>About Creator Protection</div>
              <p style={{ fontSize: "12px", color: "var(--color-ink-soft)", lineHeight: 1.5, margin: 0 }}>
                Creator OS automatically highlights high-risk terms such as perpetual usage rights,
                unlimited revisions, and unpaid whitelisting to help protect your creative rights before signing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

