"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useWorkspace } from "@/features/workspaces";
import styles from "./approvals.module.css";

type PublishRequest = components["schemas"]["PublishRequest"];
type ContentItem = components["schemas"]["ContentItem"];
type Member = components["schemas"]["MemberOut"];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Approvals: the human checkpoint. Approving marks the content Published; nothing is posted anywhere. */
export default function ApprovalsPage() {
  const { workspace } = useWorkspace();
  const [requests, setRequests] = useState<PublishRequest[] | null>(null);
  const [items, setItems] = useState<Record<string, ContentItem>>({});
  const [members, setMembers] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<PublishRequest | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const path = { workspace: workspace.slug };

  const load = useCallback(async () => {
    const p = { path: { workspace: workspace.slug } };
    const [reqs, content, people] = await Promise.all([
      client.GET("/workspaces/{workspace}/approvals", { params: p }),
      client.GET("/workspaces/{workspace}/content", { params: p }),
      client.GET("/workspaces/{workspace}/members", { params: p }),
    ]);
    if (reqs.error || !reqs.data) return setError("Couldn't load approvals.");
    setRequests(reqs.data);
    setItems(Object.fromEntries((content.data ?? []).map((i) => [i.id, i])));
    setMembers(Object.fromEntries((people.data ?? []).map((m: Member) => [m.user_id, m.name])));
  }, [workspace.slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function approve(r: PublishRequest) {
    setError(null);
    const { error: apiError } = await client.POST(
      "/workspaces/{workspace}/approvals/{request_id}/approve",
      {
        params: { path: { ...path, request_id: r.id } },
      },
    );
    if (apiError)
      setError(typeof apiError.detail === "string" ? apiError.detail : "Couldn't approve.");
    load();
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejecting) return;
    const { error: apiError } = await client.POST(
      "/workspaces/{workspace}/approvals/{request_id}/reject",
      {
        params: { path: { ...path, request_id: rejecting.id } },
        body: { reason: reason.trim() },
      },
    );
    if (apiError)
      setError(typeof apiError.detail === "string" ? apiError.detail : "Couldn't reject.");
    setRejecting(null);
    setReason("");
    load();
  }

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const decided = requests?.filter((r) => r.status !== "pending") ?? [];
  const who = (r: PublishRequest) =>
    r.source === "agent"
      ? (r.agent_name ?? "An agent")
      : (members[r.requested_by ?? ""] ?? "A member");

  return (
    <>
      <header className={styles.head}>
        <h1>Approvals</h1>
        <p>Publishes waiting for a person to decide. Nothing here has gone out yet.</p>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {requests === null && !error && <p className={styles.muted}>Loading…</p>}

      {requests !== null && pending.length === 0 && (
        <section className={styles.empty}>
          <Inbox size={28} />
          <h2>Nothing waiting</h2>
          <p>When content is sent for approval, it appears here.</p>
        </section>
      )}

      {pending.length > 0 && (
        <ul className={styles.list} aria-label="Waiting for approval">
          {pending.map((r) => {
            const item = items[r.content_item_id];
            return (
              <li key={r.id} className={styles.card}>
                <div className={styles.grow}>
                  <strong>{item?.title ?? "Deleted content"}</strong>
                  {r.note && <p>{r.note}</p>}
                  <small>
                    {item?.target_platforms.join(", ") || "No platforms"} · requested by {who(r)} ·{" "}
                    {when(r.created_at)}
                  </small>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="btn btn-row"
                    onClick={() => approve(r)}
                    aria-label={`Approve ${item?.title ?? "request"}`}
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-row"
                    onClick={() => setRejecting(r)}
                    aria-label={`Reject ${item?.title ?? "request"}`}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {decided.length > 0 && (
        <section aria-label="Recent decisions">
          <h2 className={styles.subhead}>Recent decisions</h2>
          <ul className={styles.list}>
            {decided.map((r) => (
              <li key={r.id} className={styles.row}>
                <span className={styles.grow}>
                  <strong>{items[r.content_item_id]?.title ?? "Deleted content"}</strong>
                  <small>
                    {r.status === "approved" ? "Approved" : "Rejected"} by{" "}
                    {members[r.decided_by ?? ""] ?? "a member"}
                    {r.decided_at ? ` · ${when(r.decided_at)}` : ""}
                    {r.reason ? ` · “${r.reason}”` : ""}
                  </small>
                </span>
                <span className={`pill ${r.status === "approved" ? "pill-ok" : "pill-bad"}`}>
                  {r.status === "approved" ? "Approved" : "Rejected"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Reject publish"
        width={480}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setRejecting(null)}>
              Cancel
            </button>
            <button type="submit" form="reject-form" className="btn" disabled={!reason.trim()}>
              Reject
            </button>
          </>
        }
      >
        <form id="reject-form" onSubmit={reject}>
          <label className={styles.label}>
            Reason (shared with whoever asked)
            <textarea
              className="field"
              rows={3}
              maxLength={1000}
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </form>
      </Dialog>
    </>
  );
}
