"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Send, Trash2, Webhook } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { Dialog } from "@/shared/components/ui/Dialog";
import { SettingsHeader, useWorkspace } from "@/features/workspaces";
import styles from "./integrations.module.css";

type Endpoint = components["schemas"]["WebhookEndpoint"];
type Delivery = components["schemas"]["WebhookDelivery"];
type Event = Endpoint["events"][number];

const EVENTS: { event: Event; description: string }[] = [
  {
    event: "publish.pending_approval",
    description: "A publish is waiting for a person in Approvals",
  },
  { event: "publish.approved", description: "A person approved a publish" },
  { event: "publish.rejected", description: "A person rejected a publish, with a reason" },
  { event: "content.stage_changed", description: "A content item moved to a different stage" },
];

/** Settings › Webhooks: Creator OS POSTs signed JSON to your automation when things happen. */
export default function WebhooksPage() {
  const { workspace } = useWorkspace();
  const path = { workspace: workspace.slug };
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<{ id: string; deliveries: Delivery[] } | null>(null);

  const load = useCallback(async () => {
    const { data } = await client.GET("/workspaces/{workspace}/webhooks", {
      params: { path: { workspace: workspace.slug } },
    });
    setEndpoints(data ?? []);
  }, [workspace.slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { data, error: err } = await client.POST("/workspaces/{workspace}/webhooks", {
      params: { path },
      body: { url: url.trim(), events },
    });
    if (err || !data) {
      setError(
        typeof err?.detail === "string"
          ? err.detail
          : "The URL must be https and publicly reachable.",
      );
      return;
    }
    setSecret(data.secret);
    setUrl("");
    setEvents([]);
    load();
  }

  async function showDeliveries(id: string) {
    const { data } = await client.GET("/workspaces/{workspace}/webhooks/{endpoint_id}/deliveries", {
      params: { path: { ...path, endpoint_id: id } },
    });
    setShown({ id, deliveries: data ?? [] });
  }

  async function test(id: string) {
    await client.POST("/workspaces/{workspace}/webhooks/{endpoint_id}/test", {
      params: { path: { ...path, endpoint_id: id } },
    });
    showDeliveries(id);
  }

  async function remove(ep: Endpoint) {
    if (!window.confirm(`Delete the endpoint ${ep.url}?`)) return;
    await client.DELETE("/workspaces/{workspace}/webhooks/{endpoint_id}", {
      params: { path: { ...path, endpoint_id: ep.id } },
    });
    setShown(null);
    load();
  }

  function close() {
    setOpen(false);
    setSecret(null);
    setError(null);
  }

  const validUrl = /^https:\/\/[^\s/]+\.[^\s]+$/.test(url.trim());

  return (
    <>
      <SettingsHeader tab="Webhooks" />
      <div className={styles.intro}>
        <p>
          Have Creator OS tell your automation when something happens, instead of it having to poll.
          Every delivery is signed, and retried for about 15 hours if your endpoint is down.
        </p>
        <button type="button" className="btn btn-row" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add endpoint
        </button>
      </div>
      {endpoints?.length === 0 && (
        <section className={styles.empty}>
          <Webhook size={24} />
          <strong>No endpoints yet</strong>
          <span>Add your n8n or Make webhook URL to receive events.</span>
        </section>
      )}
      {!!endpoints?.length && (
        <ul className={styles.list} aria-label="Webhook endpoints">
          {endpoints.map((ep) => (
            <li key={ep.id} className={styles.endpoint}>
              <div className={styles.endpointRow}>
                <span className={styles.grow}>
                  <strong>{ep.url}</strong>
                  <small>{ep.events.length ? ep.events.join(", ") : "All events"}</small>
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-row"
                  onClick={() => test(ep.id)}
                >
                  <Send size={14} /> Send test
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => showDeliveries(ep.id)}
                >
                  Deliveries
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Delete ${ep.url}`}
                  onClick={() => remove(ep)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {shown?.id === ep.id && (
                <ul className={styles.deliveries} aria-label="Recent deliveries">
                  {shown.deliveries.length === 0 && (
                    <li className={styles.muted}>No deliveries yet.</li>
                  )}
                  {shown.deliveries.map((d) => (
                    <li key={d.id}>
                      <code>{d.event}</code>
                      <span
                        className={`pill ${d.status === "delivered" ? "pill-ok" : d.status === "failed" ? "pill-bad" : "pill-warn"}`}
                      >
                        {d.status}
                      </span>
                      <small>
                        {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                        {d.last_status_code ? ` · HTTP ${d.last_status_code}` : ""} ·{" "}
                        {new Date(d.created_at).toLocaleString("en-GB")}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <section className={styles.doc}>
        <h3>Verifying deliveries</h3>
        <p className={styles.muted}>
          Each POST carries <code>X-CreatorOS-Event</code>, <code>X-CreatorOS-Delivery</code>,{" "}
          <code>X-CreatorOS-Timestamp</code> and <code>X-CreatorOS-Signature: sha256=…</code> — the
          HMAC-SHA256 of <code>&lt;timestamp&gt;.&lt;raw body&gt;</code> with the endpoint&apos;s
          secret. Reject requests whose signature doesn&apos;t match or whose timestamp is more than
          5 minutes old.
        </p>
      </section>

      <Dialog open={open} onClose={close} title="Add a webhook endpoint" width={560}>
        {secret ? (
          <div className={styles.form}>
            <p>Endpoint added. Copy its signing secret now — it won&apos;t be shown again.</p>
            <div className={styles.secret}>
              <code>{secret}</code>
              <button
                type="button"
                className="btn btn-outline btn-row"
                aria-label="Copy secret"
                onClick={() => navigator.clipboard.writeText(secret)}
              >
                <Copy size={14} />
              </button>
            </div>
            <button type="button" className="btn" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={create}>
            <p className={styles.muted}>
              Creator OS will POST a signed JSON body to this URL when the events you pick happen.
            </p>
            <label>
              URL
              <input
                className="field"
                required
                placeholder="https://your-n8n.example.com/webhook/creator-os"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <small>Must be https and publicly reachable.</small>
            </label>
            <fieldset className={styles.checks}>
              <legend>Events</legend>
              <small>
                Leave everything unticked to receive all events, including ones added later.
              </small>
              {EVENTS.map((ev) => (
                <label key={ev.event}>
                  <input
                    type="checkbox"
                    checked={events.includes(ev.event)}
                    onChange={() =>
                      setEvents((cur) =>
                        cur.includes(ev.event)
                          ? cur.filter((x) => x !== ev.event)
                          : [...cur, ev.event],
                      )
                    }
                  />
                  <span>
                    <code>{ev.event}</code>
                    <small>{ev.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.footer}>
              <button type="button" className="btn btn-outline" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={!validUrl}>
                Add endpoint
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
