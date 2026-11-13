"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { loadSession } from "@/shared/lib/session";
import { SettingsHeader } from "./components/SettingsHeader";
import { PERMISSION_INFO, ROLE_INFO } from "./constants/permissions";
import { useWorkspace } from "./hooks/useWorkspace";
import styles from "./settings.module.css";

type Member = components["schemas"]["MemberOut"];
type Invite = components["schemas"]["Invite"];
type Role = components["schemas"]["RolePermissions"];
type Audit = components["schemas"]["AuditEntry"];
type MemberRole = Role["role"];
type Section = "General" | "Members" | "Roles" | "Audit log";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const detail = (e: unknown, fallback: string) =>
  typeof (e as { detail?: unknown })?.detail === "string"
    ? (e as { detail: string }).detail
    : fallback;

/** Settings › Workspace: General (rename), Members (invite, roles, remove), Roles (seats, permissions), Audit log. */
export default function WorkspaceSettingsPage() {
  const { workspace } = useWorkspace();
  const can = (p: string) => workspace.permissions?.includes(p) ?? false;
  const isOwner = workspace.role === "owner";
  const sections: Section[] = [
    "General",
    "Members",
    "Roles",
    ...(can("manage_workspace") ? (["Audit log"] as const) : []),
  ];
  const [section, setSection] = useState<Section>("General");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <>
      <SettingsHeader tab="Workspace" />
      <div className={styles.segmented} role="tablist" aria-label="Workspace settings">
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            onClick={() => {
              setSection(s);
              setNotice(null);
            }}
          >
            {s}
          </button>
        ))}
      </div>
      {notice && (
        <p className={notice.ok ? styles.ok : styles.error} role="status">
          {notice.text}
        </p>
      )}
      {section === "General" && <General canEdit={can("manage_workspace")} onNotice={setNotice} />}
      {section === "Members" && (
        <Members canInvite={can("invite_members")} isOwner={isOwner} onNotice={setNotice} />
      )}
      {section === "Roles" && <Roles isOwner={isOwner} onNotice={setNotice} />}
      {section === "Audit log" && <AuditLog />}
    </>
  );
}

type Notify = (n: { ok: boolean; text: string } | null) => void;

function General({ canEdit, onNotice }: { canEdit: boolean; onNotice: Notify }) {
  const { workspace } = useWorkspace();
  const [name, setName] = useState(workspace.name);
  const address =
    typeof window === "undefined" ? "" : `${window.location.origin}/dashboard/${workspace.slug}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await client.PATCH("/workspaces/{workspace}", {
      params: { path: { workspace: workspace.slug } },
      body: { name: name.trim() },
    });
    onNotice(
      error
        ? { ok: false, text: detail(error, "Couldn't rename.") }
        : { ok: true, text: "Saved. Reload to see it in the switcher." },
    );
  }

  return (
    <section className={styles.card}>
      <h3>General</h3>
      <p className={styles.muted}>The workspace name appears in the switcher and on invitations.</p>
      <form className={styles.row} onSubmit={save}>
        <label className={styles.grow}>
          Workspace name
          <input
            className="field"
            maxLength={80}
            value={name}
            disabled={!canEdit}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn"
          disabled={!canEdit || !name.trim() || name.trim() === workspace.name}
        >
          Save changes
        </button>
      </form>
      <div className={styles.address}>
        <span>Workspace address</span>
        <code>{address}</code>
        <button
          type="button"
          className="btn btn-outline btn-row"
          aria-label="Copy workspace address"
          onClick={() => navigator.clipboard.writeText(address)}
        >
          <Copy size={14} />
        </button>
      </div>
    </section>
  );
}

function Members({
  canInvite,
  isOwner,
  onNotice,
}: {
  canInvite: boolean;
  isOwner: boolean;
  onNotice: Notify;
}) {
  const { workspace } = useWorkspace();
  const path = { workspace: workspace.slug };
  const me = loadSession()?.user_id;
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("script_writer");
  const [link, setLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = { path: { workspace: workspace.slug } };
    const [m, i, r] = await Promise.all([
      client.GET("/workspaces/{workspace}/members", { params: p }),
      canInvite ? client.GET("/workspaces/{workspace}/invites", { params: p }) : null,
      client.GET("/workspaces/{workspace}/roles", { params: p }),
    ]);
    setMembers(m.data ?? []);
    setInvites(i?.data ?? []);
    setRoles(r.data ?? []);
  }, [workspace.slug, canInvite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  const left = useMemo(() => {
    const pending = (r: string) =>
      invites.filter((i) => i.role === r && new Date(i.expires_at) > new Date()).length;
    return Object.fromEntries(
      roles.map((r) => [r.role, Math.max(0, r.seats_total - r.seats_used - pending(r.role))]),
    );
  }, [roles, invites]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLink(null);
    const { data, error } = await client.POST("/workspaces/{workspace}/invites", {
      params: { path },
      body: { email, role },
    });
    if (error || !data)
      return onNotice({ ok: false, text: detail(error, "Couldn't send the invitation.") });
    const url = `${window.location.origin}${data.accept_path}`;
    setLink(url);
    setEmail("");
    onNotice({
      ok: true,
      text: data.emailed
        ? `Invitation emailed to ${data.invite.email}.`
        : "Invitation created — copy the link below and send it yourself.",
    });
    load();
  }

  async function changeRole(m: Member, next: MemberRole) {
    const { error } = await client.PATCH("/workspaces/{workspace}/members/{user_id}", {
      params: { path: { ...path, user_id: m.user_id } },
      body: { role: next },
    });
    onNotice(
      error
        ? { ok: false, text: detail(error, "Couldn't change the role.") }
        : { ok: true, text: `${m.name} is now ${ROLE_INFO[next].label}.` },
    );
    load();
  }

  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name} from ${workspace.name}?`)) return;
    const { error } = await client.DELETE("/workspaces/{workspace}/members/{user_id}", {
      params: { path: { ...path, user_id: m.user_id } },
    });
    onNotice(
      error
        ? { ok: false, text: detail(error, "Couldn't remove the member.") }
        : { ok: true, text: `${m.name} was removed.` },
    );
    load();
  }

  async function revoke(i: Invite) {
    await client.DELETE("/workspaces/{workspace}/invites/{invite_id}", {
      params: { path: { ...path, invite_id: i.id } },
    });
    load();
  }

  return (
    <>
      {canInvite && (
        <section className={styles.card}>
          <h3>Invite a member</h3>
          <p className={styles.muted}>
            They receive an email invitation and join with the role you choose.
          </p>
          <form className={styles.row} onSubmit={invite}>
            <label className={styles.grow}>
              Email address
              <input
                className="field"
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Role
              <select
                className="field"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                {roles.map((r) => (
                  <option key={r.role} value={r.role} disabled={left[r.role] === 0}>
                    {ROLE_INFO[r.role].label} ({left[r.role] ?? 0} left)
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn" disabled={!email || left[role] === 0}>
              Send invite
            </button>
          </form>
          {link && (
            <div className={styles.address}>
              <span>Invitation link (valid 7 days)</span>
              <code>{link}</code>
              <button
                type="button"
                className="btn btn-outline btn-row"
                aria-label="Copy invitation link"
                onClick={() => navigator.clipboard.writeText(link)}
              >
                <Copy size={14} />
              </button>
            </div>
          )}
          {invites.length > 0 && (
            <ul className={styles.list} aria-label="Pending invitations">
              {invites.map((i) => (
                <li key={i.id}>
                  <span className={styles.grow}>
                    <strong>{i.email}</strong>
                    <small>
                      {ROLE_INFO[i.role].label} ·{" "}
                      {new Date(i.expires_at) < new Date()
                        ? "expired"
                        : `expires ${new Date(i.expires_at).toLocaleDateString("en-GB")}`}
                    </small>
                  </span>
                  <button type="button" className="btn btn-outline" onClick={() => revoke(i)}>
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className={styles.card}>
        <h3>Members</h3>
        <p className={styles.muted}>
          {members.length} {members.length === 1 ? "person has" : "people have"} access to this
          workspace.
        </p>
        <ul className={styles.list} aria-label="Members">
          {members.map((m) => (
            <li key={m.user_id}>
              <span className={styles.avatar}>{m.name[0]?.toUpperCase()}</span>
              <span className={styles.grow}>
                <strong>
                  {m.name}
                  {m.user_id === me ? " (you)" : ""}
                </strong>
                <small>{m.email}</small>
              </span>
              {isOwner && m.role !== "owner" ? (
                <>
                  <select
                    className="field"
                    aria-label={`Role of ${m.name}`}
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value as MemberRole)}
                  >
                    {roles.map((r) => (
                      <option key={r.role} value={r.role}>
                        {ROLE_INFO[r.role].label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={`Remove ${m.name}`}
                    onClick={() => remove(m)}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <span className="pill pill-neu">{ROLE_INFO[m.role]?.label ?? m.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Roles({ isOwner, onNotice }: { isOwner: boolean; onNotice: Notify }) {
  const { workspace } = useWorkspace();
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    client
      .GET("/workspaces/{workspace}/roles", { params: { path: { workspace: workspace.slug } } })
      .then(({ data }) => setRoles(data ?? []));
  }, [workspace.slug]);

  async function toggle(r: Role, key: string) {
    const next = r.permissions.includes(key)
      ? r.permissions.filter((p) => p !== key)
      : [...r.permissions, key];
    const { data, error } = await client.PUT("/workspaces/{workspace}/roles/{role}", {
      params: { path: { workspace: workspace.slug, role: r.role } },
      body: { permissions: next },
    });
    if (error || !data)
      return onNotice({ ok: false, text: detail(error, "Couldn't change permissions.") });
    setRoles(data);
  }

  return (
    <>
      <section className={styles.card}>
        <h3>Seats</h3>
        <p className={styles.muted}>
          Each role has 2 seats. Change a member&apos;s role to free one.
        </p>
        <div className={styles.seats}>
          {roles.map((r) => (
            <div key={r.role} className={styles.seat}>
              <strong>{ROLE_INFO[r.role].label}</strong>
              <span
                className={styles.bar}
                role="progressbar"
                aria-label={`${ROLE_INFO[r.role].label} seats used`}
                aria-valuemin={0}
                aria-valuemax={r.seats_total}
                aria-valuenow={r.seats_used}
              >
                <span style={{ width: `${(r.seats_used / r.seats_total) * 100}%` }} />
              </span>
              <small>
                {r.seats_used} of {r.seats_total} used
              </small>
              <p className={styles.muted}>{ROLE_INFO[r.role].description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.card}>
        <h3>Role permissions</h3>
        <p className={styles.muted}>
          What each role can reach in this workspace.{" "}
          {isOwner ? "Changes apply immediately." : "Only the owner can change these."}
        </p>
        <div className={styles.seats}>
          {roles.map((r) => (
            <fieldset key={r.role} className={styles.perms}>
              <legend>
                {ROLE_INFO[r.role].label}{" "}
                <span className="pill pill-neu">
                  {r.permissions.length} of {PERMISSION_INFO.length}
                </span>
              </legend>
              {PERMISSION_INFO.map((p) => (
                <label key={p.key} title={p.description}>
                  <input
                    type="checkbox"
                    checked={r.permissions.includes(p.key)}
                    disabled={!isOwner}
                    onChange={() => toggle(r, p.key)}
                  />
                  <span>
                    {p.label}
                    <small>{p.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </section>
    </>
  );
}

function AuditLog() {
  const { workspace } = useWorkspace();
  const [entries, setEntries] = useState<Audit[] | null>(null);
  const [action, setAction] = useState("all");
  const [outcome, setOutcome] = useState("any");

  useEffect(() => {
    client
      .GET("/workspaces/{workspace}/audit-log", { params: { path: { workspace: workspace.slug } } })
      .then(({ data }) => setEntries(data ?? []));
  }, [workspace.slug]);

  const actions = [...new Set((entries ?? []).map((e) => e.action))].sort();
  const shown = (entries ?? []).filter(
    (e) =>
      (action === "all" || e.action === action) && (outcome === "any" || e.outcome === outcome),
  );

  return (
    <section className={styles.card}>
      <h3>Activity</h3>
      <p className={styles.muted}>Who did what in this workspace, most recent first.</p>
      <div className={styles.row}>
        <select
          className="field"
          aria-label="Activity"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="all">All activity</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select
          className="field"
          aria-label="Outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
        >
          <option value="any">Any outcome</option>
          <option value="allowed">Allowed</option>
          <option value="denied">Denied</option>
        </select>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Who</th>
              <th>What</th>
              <th>Outcome</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {entries === null && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  Loading…
                </td>
              </tr>
            )}
            {entries !== null && shown.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No activity matches.
                </td>
              </tr>
            )}
            {shown.map((e) => (
              <tr key={e.id}>
                <td>{e.actor_label}</td>
                <td>
                  {e.action}
                  {e.subject && <small>{e.subject}</small>}
                </td>
                <td>
                  <span className={`pill ${e.outcome === "allowed" ? "pill-ok" : "pill-bad"}`}>
                    {e.outcome === "allowed" ? (
                      <ShieldCheck size={12} />
                    ) : (
                      <ShieldAlert size={12} />
                    )}
                    {e.outcome === "allowed" ? "Allowed" : "Denied"}
                  </span>
                </td>
                <td title={new Date(e.created_at).toLocaleString("en-GB")}>{ago(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
