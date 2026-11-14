"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  Handshake,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import client from "@/shared/lib/api-client";
import { useQuery } from "@/shared/lib/query-cache";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { useWorkspace } from "@/features/workspaces";
import { DealWizard } from "./components/DealWizard";
import {
  PRIORITIES,
  STATUS,
  STATUSES,
  formatMoney,
  type CrmDeal,
  type CrmStats,
  type CrmStatus,
  type PlatformDeal,
  type Priority,
} from "./constants/crm";
import styles from "./crm.module.css";

type SortKey = "company_name" | "deal_size" | "status" | "priority" | "expected_close_date";
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "company_name", label: "Brand" },
  { key: "deal_size", label: "Value" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "expected_close_date", label: "Expected close" },
];
const RANK: Record<string, number> = Object.fromEntries([
  ...STATUSES.map((s, i) => [s.value, i]),
  ...PRIORITIES.map((p, i) => [p.value, i]),
]);

function compare(a: CrmDeal, b: CrmDeal, key: SortKey): number {
  const x = a[key] ?? "";
  const y = b[key] ?? "";
  if (key === "status" || key === "priority") return RANK[String(x)] - RANK[String(y)];
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y));
}

function toCsv(deals: CrmDeal[]): string {
  const head = [
    "Brand",
    "Contact",
    "Email",
    "Value",
    "Currency",
    "Status",
    "Priority",
    "Expected close",
    "Tags",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const rows = deals.map((d) =>
    [
      d.company_name,
      d.contact_name,
      d.contact_email,
      d.deal_size,
      d.currency,
      STATUS[d.status].label,
      d.priority,
      d.expected_close_date,
      d.tags?.join("; "),
    ]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...rows].join("\n");
}

/** Brand CRM: the creator's own brand deals plus the deals brands made with them on Creator OS. */
export default function CrmPage() {
  const { workspace, base } = useWorkspace();
  const [actionError, setError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ deal?: CrmDeal } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<CrmStatus[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "expected_close_date",
    desc: false,
  });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  // cached: revisiting the CRM shows the last data at once and refreshes in the background
  const crm = useQuery(`crm:${workspace.slug}`, async () => {
    const path = { workspace: workspace.slug };
    const [list, kpis, onPlatform] = await Promise.all([
      client.GET("/workspaces/{workspace}/crm/deals", { params: { path } }),
      client.GET("/workspaces/{workspace}/crm/stats", { params: { path } }),
      client.GET("/workspaces/{workspace}/crm/platform-deals", { params: { path } }),
    ]);
    if (!list.data) return undefined;
    return { deals: list.data, stats: kpis.data ?? null, platform: onPlatform.data ?? [] };
  });
  const deals: CrmDeal[] | null = crm.data?.deals ?? null;
  const stats: CrmStats | null = crm.data?.stats ?? null;
  const platform: PlatformDeal[] = crm.data?.platform ?? [];
  const load = crm.refresh;
  const error = actionError ?? (crm.error && !crm.data ? "Couldn't load your deals." : null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (deals ?? []).filter(
      (d) =>
        (!q || `${d.company_name} ${d.contact_name ?? ""}`.toLowerCase().includes(q)) &&
        (!statuses.length || statuses.includes(d.status)) &&
        (!priorities.length || priorities.includes(d.priority)),
    );
    rows.sort((a, b) => compare(a, b, sort.key) * (sort.desc ? -1 : 1));
    return rows;
  }, [deals, query, statuses, priorities, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / perPage));
  const current = Math.min(page, pages - 1);
  const shown = visible.slice(current * perPage, (current + 1) * perPage);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function remove(deal: CrmDeal) {
    if (!window.confirm(`Delete the ${deal.company_name} deal? Linked content stays, unlinked.`))
      return;
    const { error: apiError } = await client.DELETE("/workspaces/{workspace}/crm/deals/{deal_id}", {
      params: { path: { workspace: workspace.slug, deal_id: deal.id } },
    });
    if (apiError) setError("Couldn't delete the deal.");
    load();
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(visible)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "brand-deals.csv",
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalValue = stats
    ? Object.entries(stats.value_by_currency)
        .map(([cur, v]) => formatMoney(v, cur))
        .join(" · ") || formatMoney(0, "INR")
    : "—";
  const recent = [...(deals ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        base={base}
        icon={Users}
        title="Brand CRM"
        subtitle="Manage your brand partnerships and sponsorship deals"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline btn-row"
              aria-pressed={showFilters}
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter size={14} /> Filter
            </button>
            <button
              type="button"
              className="btn btn-outline btn-row"
              onClick={exportCsv}
              disabled={!visible.length}
            >
              <Download size={14} /> Export
            </button>
            <button type="button" className="btn btn-row" onClick={() => setWizard({})}>
              <Plus size={14} /> New Deal
            </button>
          </>
        }
      />

      {error && (
        <p className={styles.errorBox} role="alert">
          {error}
        </p>
      )}

      <div className={styles.kpis}>
        <section className={styles.kpi} aria-label="Total Deals">
          <span>
            Total Deals <Handshake size={16} />
          </span>
          <strong>{stats?.total ?? "—"}</strong>
        </section>
        <section className={styles.kpi} aria-label="Total Value">
          <span>
            Total Value <Wallet size={16} />
          </span>
          <strong className={styles.money}>{totalValue}</strong>
        </section>
        <section className={styles.kpi} aria-label="Closed Deals">
          <span>
            Closed Deals <Users size={16} />
          </span>
          <strong>{stats?.closed ?? "—"}</strong>
        </section>
        <section className={styles.kpi} aria-label="Conversion Rate">
          <span>
            Conversion Rate <TrendingUp size={16} />
          </span>
          <strong>{stats ? `${stats.conversion_pct.toFixed(1)}%` : "—"}</strong>
          {stats && stats.follow_ups_due > 0 && (
            <small className={styles.warn}>{stats.follow_ups_due} follow-up(s) due</small>
          )}
        </section>
      </div>

      {showFilters && (
        <div className={styles.filters}>
          <input
            className="field"
            placeholder="Search by brand or contact..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            aria-label="Search deals"
          />
          <div className={styles.chipRow} role="group" aria-label="Status">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={statuses.includes(s.value)}
                onClick={() => setStatuses(toggle(statuses, s.value))}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className={styles.chipRow} role="group" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={priorities.includes(p.value)}
                onClick={() => setPriorities(toggle(priorities, p.value))}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={styles.clear}
              onClick={() => {
                setQuery("");
                setStatuses([]);
                setPriorities([]);
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>
            Brand deals for this workspace, with value, status, priority and expected close date
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}
                >
                  <button
                    type="button"
                    aria-label={`Sort by ${c.label}`}
                    onClick={() => setSort({ key: c.key, desc: sort.key === c.key && !sort.desc })}
                  >
                    {c.label} <ArrowUpDown size={12} />
                  </button>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals === null && !error && (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  Loading…
                </td>
              </tr>
            )}
            {deals !== null && shown.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  {deals.length
                    ? "No deals match the current filters."
                    : "No deals yet. Add your first one with New Deal."}
                </td>
              </tr>
            )}
            {shown.map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{d.company_name}</strong>
                  {d.contact_name && <small>{d.contact_name}</small>}
                </td>
                <td>{formatMoney(d.deal_size ?? 0, d.currency ?? "INR")}</td>
                <td>
                  <span className={`pill ${STATUS[d.status].pill}`}>{STATUS[d.status].label}</span>
                </td>
                <td className={styles.cap}>{d.priority}</td>
                <td>{d.expected_close_date ?? "—"}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      aria-label={`Edit ${d.company_name}`}
                      onClick={() => setWizard({ deal: d })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${d.company_name}`}
                      onClick={() => remove(d)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.pager}>
        <span>
          {visible.length} row{visible.length === 1 ? "" : "s"}
        </span>
        <label>
          Rows per page{" "}
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span>
          Page {current + 1} of {pages}
        </span>
        <div className={styles.rowActions}>
          <button
            type="button"
            aria-label="First page"
            disabled={current === 0}
            onClick={() => setPage(0)}
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={current >= pages - 1}
            onClick={() => setPage(pages - 1)}
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>

      <details className={styles.insights} open>
        <summary>Pipeline & Insights</summary>
        <div className={styles.insightGrid}>
          <section aria-label="Pipeline Overview">
            <h3>Pipeline Overview</h3>
            <ul>
              {STATUSES.map((s) => {
                const n = stats?.by_status[s.value] ?? 0;
                return (
                  <li key={s.value}>
                    <span className={styles.dot} style={{ background: s.dot }} />
                    <span className={styles.grow}>{s.label}</span>
                    <span>{n}</span>
                    <span className={styles.muted}>
                      {stats?.total ? ((n * 100) / stats.total).toFixed(1) : "0.0"}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-label="Recent Activity">
            <h3>Recent Activity</h3>
            {recent.length ? (
              <ul>
                {recent.map((d) => (
                  <li key={d.id}>
                    <span className={styles.grow}>
                      {d.company_name} · {STATUS[d.status].label}
                    </span>
                    <span className={styles.muted}>
                      {new Date(d.updated_at).toLocaleDateString("en-GB")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No recent activity</p>
            )}
          </section>
          <section aria-label="Top Brands">
            <h3>Top Brands</h3>
            {stats?.top_brands.length ? (
              <ul>
                {stats.top_brands.map(({ name, deals: n }) => (
                  <li key={name}>
                    <span className={styles.grow}>{name}</span>
                    <span>
                      {n} deal{n === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No brands yet</p>
            )}
          </section>
        </div>
      </details>

      <section className={styles.platform} aria-label="On Creator OS">
        <h3>On Creator OS</h3>
        <p className={styles.muted}>
          Deals brands made with you on Creator OS. They manage these on their side.
        </p>
        {platform.length ? (
          <ul>
            {platform.map((d) => (
              <li key={d.id}>
                <span className={styles.grow}>
                  <strong>{d.campaign_name}</strong>
                  <small>
                    {d.brand_name} · updated {new Date(d.updated_at).toLocaleDateString("en-GB")}
                  </small>
                </span>
                {d.value_inr != null && <span>{formatMoney(d.value_inr, "INR")}</span>}
                <span className={`pill pill-neu ${styles.cap}`}>
                  {d.status.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No brand deals on Creator OS yet.</p>
        )}
      </section>

      {wizard && (
        <DealWizard
          workspace={workspace.slug}
          deal={wizard.deal}
          onClose={() => setWizard(null)}
          onSaved={() => load()}
        />
      )}
    </>
  );
}
