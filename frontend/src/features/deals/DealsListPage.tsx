"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake, Plus, Search } from "lucide-react";
import client from "@/shared/lib/api-client";
import { PageHeader } from "@/shared/components/shell/PageHeader";
import { Dialog } from "@/shared/components/ui/Dialog";
import { StatusPill } from "@/shared/components/ui/StatusPill";
import { DEAL_STAGE_LABEL } from "@/shared/constants/deal-stages";
import { nameById, useCreators, useDeals } from "@/shared/lib/brand-queries";
import { formatInr } from "@/shared/lib/format-currency";
import { dealStatusVariant } from "@/shared/lib/status-variants";
import page from "@/shared/components/shell/page.module.css";

/** Brand: every deal, searchable and filterable by stage, plus "New deal". */
export default function DealsListPage() {
  const router = useRouter();
  const deals = useDeals();
  const creators = useCreators().data;
  const names = nameById(creators);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Home and ⌘K link here with ?new=1
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the URL after mount
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function createDeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = String(form.get("value_inr") || "");
    setBusy(true);
    setFormError(null);
    const { data, error } = await client.POST("/deals", {
      body: {
        creator_id: String(form.get("creator_id")),
        campaign_name: String(form.get("campaign_name")).trim(),
        contact_email: String(form.get("contact_email")).trim(),
        value_inr: value ? Number(value) : null,
      },
    });
    setBusy(false);
    if (error || !data) return setFormError("Couldn't create the deal.");
    deals.mutate((list) => [data, ...(list ?? [])]);
    setOpen(false);
    router.push(`/deals/${data.id}`);
  }

  const q = query.trim().toLowerCase();
  const visible = (deals.data ?? []).filter(
    (d) =>
      (stage === "all" || d.status === stage) &&
      (!q ||
        d.campaign_name.toLowerCase().includes(q) ||
        (names[d.creator_id] ?? "").toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        base="/brand"
        icon={Handshake}
        title="Deals"
        subtitle="Every campaign you run with creators"
        actions={
          <button type="button" className="btn btn-row" onClick={() => setOpen(true)}>
            <Plus size={14} /> New deal
          </button>
        }
      />
      {deals.error && !deals.data && (
        <p className={page.errorBox} role="alert">
          Couldn&apos;t load your deals. Try refreshing.
        </p>
      )}

      <div className={page.filters}>
        <label className={page.row}>
          <Search size={14} aria-hidden />
          <input
            className="field"
            placeholder="Search campaign or creator…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search deals"
          />
        </label>
        <select
          className="field"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Filter by stage"
        >
          <option value="all">All stages</option>
          {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={page.tableWrap}>
        <table className={page.table}>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Creator</th>
              <th>Stage</th>
              <th>Value</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/deals/${d.id}`}>{d.campaign_name}</Link>
                </td>
                <td>
                  <Link href={`/creators/${d.creator_id}`}>{names[d.creator_id] ?? "—"}</Link>
                </td>
                <td>
                  <span className={page.row}>
                    <StatusPill
                      status={DEAL_STAGE_LABEL[d.status] ?? d.status}
                      variant={dealStatusVariant(d.status)}
                    />
                    {!d.brand_viewed_at && <StatusPill status="New" variant="accent" />}
                  </span>
                </td>
                <td>{d.value_inr != null ? formatInr(Number(d.value_inr)) : "—"}</td>
                <td>{new Date(d.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className={page.empty}>
            {!deals.data
              ? "Loading…"
              : deals.data.length
                ? "No deals match these filters."
                : "No deals yet — start one with New deal."}
          </p>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="New deal" width={560}>
        {creators && creators.length === 0 ? (
          <p className={page.muted}>
            You need a creator first. <Link href="/creators?new=1">Onboard a creator</Link> or share
            your invite code from the Creators page.
          </p>
        ) : (
          <form className={page.form} onSubmit={createDeal}>
            <label>
              Creator
              <select name="creator_id" required className="field" defaultValue="">
                <option value="" disabled>
                  Select a creator…
                </option>
                {(creators ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Campaign name
              <input name="campaign_name" required maxLength={200} className="field" />
            </label>
            <label>
              Contact email
              <input name="contact_email" type="email" required className="field" />
            </label>
            <label>
              Deal value (₹, optional)
              <input name="value_inr" type="number" min={0} step="1" className="field" />
            </label>
            {formError && <p className={`${page.errorBox} ${page.full}`}>{formError}</p>}
            <div className={page.full}>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create deal"}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
