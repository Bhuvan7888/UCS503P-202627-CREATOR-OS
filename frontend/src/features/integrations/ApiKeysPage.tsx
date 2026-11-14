"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Plus } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { Dialog } from "@/shared/components/ui/Dialog";
import { SettingsHeader, useWorkspace } from "@/features/workspaces";
import styles from "./integrations.module.css";

type ApiKey = components["schemas"]["ApiKey"];
type Scope = ApiKey["scopes"][number];

const SCOPES: { scope: Scope; description: string }[] = [
  { scope: "content:read", description: "Read ideas, scripts and content items" },
  { scope: "content:write", description: "Create and edit ideas, scripts and content items" },
  { scope: "publish:write", description: "Request a publish — it waits in Approvals for a person" },
  { scope: "channels:read", description: "See which platforms are connected" },
  { scope: "analytics:read", description: "Read performance metrics" },
  { scope: "webhooks:write", description: "Register endpoints to receive events" },
  {
    scope: "owner",
    description: "Everything above. Still can't approve, manage keys, invite or change roles.",
  },
];

/** Settings › API keys: give an agent or automation scoped access to this workspace. */
export default function ApiKeysPage() {
  const { workspace } = useWorkspace();
  const path = { workspace: workspace.slug };
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["content:read"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: e } = await client.GET("/workspaces/{workspace}/api-keys", {
      params: { path: { workspace: workspace.slug } },
    });
    if (e) setError("Couldn't load API keys.");
    setKeys(data ?? []);
  }, [workspace.slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data, error: err } = await client.POST("/workspaces/{workspace}/api-keys", {
      params: { path },
      body: { name: name.trim(), scopes },
    });
    if (err || !data) return setError("Couldn't create the key.");
    setSecret(data.secret);
    setName("");
    setScopes(["content:read"]);
    load();
  }

  async function revoke(k: ApiKey) {
    if (!window.confirm(`Revoke "${k.name}"? Anything using it stops working immediately.`)) return;
    await client.DELETE("/workspaces/{workspace}/api-keys/{key_id}", {
      params: { path: { ...path, key_id: k.id } },
    });
    load();
  }

  function close() {
    setOpen(false);
    setSecret(null);
  }

  return (
    <>
      <SettingsHeader tab="API keys" />
      <div className={styles.intro}>
        <p>
          Give an agent or automation access to this workspace. The key only reaches what you allow,
          every call is recorded in the audit log under its name, and revoking it ends that access
          immediately.
        </p>
        <button type="button" className="btn btn-row" onClick={() => setOpen(true)}>
          <Plus size={14} /> New key
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {keys?.length === 0 && (
        <section className={styles.empty}>
          <KeyRound size={24} />
          <strong>No API keys yet</strong>
          <span>Create one to connect Hermes, OpenClaw, n8n or Make.</span>
        </section>
      )}
      {!!keys?.length && (
        <ul className={styles.list} aria-label="API keys">
          {keys.map((k) => (
            <li key={k.id}>
              <span className={styles.grow}>
                <strong>{k.name}</strong>
                <small>
                  <code>cos_{k.prefix}_…</code> · {k.scopes.join(", ")} · created{" "}
                  {new Date(k.created_at).toLocaleDateString("en-GB")}
                  {k.last_used_at
                    ? ` · last used ${new Date(k.last_used_at).toLocaleString("en-GB")}`
                    : " · never used"}
                </small>
              </span>
              {k.revoked_at ? (
                <span className="pill pill-bad">Revoked</span>
              ) : (
                <button type="button" className="btn btn-outline" onClick={() => revoke(k)}>
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={close} title="New API key" width={540}>
        {secret ? (
          <div className={styles.form}>
            <p>Copy this key now — it won&apos;t be shown again.</p>
            <div className={styles.secret}>
              <code>{secret}</code>
              <button
                type="button"
                className="btn btn-outline btn-row"
                aria-label="Copy key"
                onClick={() => navigator.clipboard.writeText(secret)}
              >
                <Copy size={14} />
              </button>
            </div>
            <p className={styles.muted}>
              Send it as <code>Authorization: Bearer &lt;key&gt;</code> to the Creator OS API.
            </p>
            <button type="button" className="btn" onClick={close}>
              I&apos;ve saved it
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={create}>
            <p className={styles.muted}>
              Grant only what the agent needs. You can revoke a key at any time.
            </p>
            <label>
              Name
              <input
                className="field"
                required
                maxLength={80}
                placeholder="Hermes agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <small>Shown in the audit log next to everything this key does.</small>
            </label>
            <fieldset className={styles.checks}>
              <legend>Scopes</legend>
              {SCOPES.map((s) => (
                <label key={s.scope}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.scope)}
                    onChange={() =>
                      setScopes((cur) =>
                        cur.includes(s.scope)
                          ? cur.filter((x) => x !== s.scope)
                          : [...cur, s.scope],
                      )
                    }
                  />
                  <span>
                    <code>{s.scope}</code>
                    <small>{s.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className={styles.notice}>
              No key can approve a publish, create keys, invite members or change roles — those stay
              with a signed-in person.
            </p>
            <button type="submit" className="btn" disabled={!name.trim() || scopes.length === 0}>
              Create key
            </button>
          </form>
        )}
      </Dialog>
    </>
  );
}
