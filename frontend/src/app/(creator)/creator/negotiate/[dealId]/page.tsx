"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import client from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { ForecastChart } from "@/components/creator/ForecastChart";
import { RateCalculatorForm } from "@/components/creator/RateCalculatorForm";
import { NegotiationChat } from "@/components/creator/NegotiationChat";
import { loadSession } from "@/lib/auth";
import type { components } from "@/lib/api-types";

type Deal = components["schemas"]["Deal"];
type Creator = components["schemas"]["Creator"];
type Brand = components["schemas"]["Brand"];
type NegotiationSession = components["schemas"]["NegotiationSession"];
type NegotiationOffer = components["schemas"]["NegotiationOffer"];
type ForecastPoint = components["schemas"]["ForecastPoint"];
type NegotiationConversation = components["schemas"]["NegotiationConversation"];

const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead", negotiating: "Negotiating", contracted: "Contracted",
  in_production: "In production", completed: "Completed", cancelled: "Cancelled",
};

const CHECKLIST_LABELS: [keyof NegotiationSession["checklist"], string][] = [
  ["usage_rights_duration_set", "Usage rights duration"],
  ["exclusivity_scope_set", "Exclusivity scope"],
  ["revision_limit_set", "Revision limit"],
  ["payment_timeline_set", "Payment timeline"],
];

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function NegotiatePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params);

  const [error, setError] = useState(false);
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [profile, setProfile] = useState<Creator | null>(null);
  const [linkedBrands, setLinkedBrands] = useState<Brand[]>([]);
  const [session, setSession] = useState<NegotiationSession | null | undefined>(undefined);
  const [offers, setOffers] = useState<NegotiationOffer[]>([]);
  const [conversations, setConversations] = useState<NegotiationConversation[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [conversationText, setConversationText] = useState("");
  const [brandNameInput, setBrandNameInput] = useState("");
  const [convoBusy, setConvoBusy] = useState(false);

  function reload() {
    const auth = loadSession();
    if (!auth?.creator_id) return;

    Promise.all([
      client.GET("/creators/{id}", { params: { path: { id: auth.creator_id } } }),
      client.GET("/deals", { params: { query: { limit: 50 } } }),
      client.GET("/negotiation/sessions", { params: { query: { limit: 20 } } }),
      client.GET("/creators/me/brands"),
    ]).then(([profileRes, dealsRes, sessionsRes, brandsRes]) => {
      if (dealsRes.error) { setError(true); return; }
      setProfile(profileRes.data ?? null);
      setLinkedBrands(brandsRes.data ?? []);
      const foundDeal = (dealsRes.data ?? []).find((d) => d.id === dealId) ?? null;
      setDeal(foundDeal);
      const foundSession = (sessionsRes.data ?? []).find((s) => s.deal_id === dealId) ?? null;
      setSession(foundSession);
      if (foundSession) {
        client.GET("/negotiation/sessions/{id}/offers", { params: { path: { id: foundSession.id } } })
          .then(({ data }) => setOffers(data ?? []));
        client.GET("/negotiation/sessions/{id}/conversations", { params: { path: { id: foundSession.id } } })
          .then(({ data }) => setConversations(data ?? []));
      }
    });
  }

  useEffect(() => { reload(); }, [dealId]);

  useEffect(() => {
    if (!session) return;
    // No explicit weekly_growth_rate — the backend auto-derives it from the
    // creator's recorded follower snapshots (see /creator "Know your worth"),
    // falling back to its own default assumption when there isn't enough history yet.
    client.GET("/negotiation/sessions/{id}/forecast", {
      params: { path: { id: session.id }, query: { weeks: 12 } },
    }).then(({ data }) => setForecast(data ?? []));
  }, [session]);

  async function createSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    const { data: newSession } = await client.POST("/negotiation/sessions", {
      body: {
        deal_id: dealId,
        views_per_week: Number(form.get("views_per_week")),
        niche_cpm: Number(form.get("niche_cpm")),
        follower_tier_multiplier: Number(form.get("follower_tier_multiplier")),
        engagement_rate_adjustment: Number(form.get("engagement_rate_adjustment")),
      },
    });
    setBusy(false);
    if (newSession) setSession(newSession);
  }

  async function askNegotiationAi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = knownBrandName ?? (conversations[0]?.brand_name || brandNameInput);
    if (!session || !name.trim() || !conversationText.trim()) return;
    setConvoBusy(true);
    try {
      const { data, error: apiError } = await client.POST("/negotiation/sessions/{id}/conversations", {
        params: { path: { id: session.id } },
        body: { brand_name: name, conversation_text: conversationText },
      });
      if (apiError || !data) return;
      setConversations((prev) => [data, ...prev]);
      setConversationText("");
    } finally {
      setConvoBusy(false);
    }
  }

  if (error) return <EmptyState icon={ArrowLeft} message="Couldn't load this negotiation." />;
  if (deal === undefined || session === undefined) {
    return <div style={{ fontSize: "13px", color: "var(--color-ink-faint)" }}>Loading…</div>;
  }
  if (!deal) return <EmptyState icon={ArrowLeft} message="Deal not found." />;

  const realBrandName = linkedBrands.find((b) => b.id === deal.brand_id)?.name;
  const brandLabel = realBrandName ? `${realBrandName} — ${deal.campaign_name}` : deal.campaign_name;
  // For a linked deal the brand is already known; for a creator's own
  // unlinked project there's no brand on the platform yet, so the AI needs
  // the creator to type who they're actually talking to.
  const knownBrandName = realBrandName;
  const latestBrandOffer = [...offers].reverse().find((o) => o.sender === "brand");
  const week12 = forecast[forecast.length - 1];
  const checklistDone = session ? CHECKLIST_LABELS.filter(([key]) => session.checklist[key]).length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <Link href="/creator" style={{ fontSize: "12px", color: "var(--color-ink-soft)" }}>← Back to dashboard</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
          <h1 className="text-h2" style={{ margin: 0 }}>{brandLabel}</h1>
          <StatusPill status={DEAL_STAGE_LABEL[deal.status] ?? deal.status} variant="accent" />
        </div>
      </div>

      {!session ? (
        <div className="mtile">
          <div className="lbl" style={{ marginBottom: "8px" }}>Set up your rate calculator</div>
          <div style={{ fontSize: "12px", color: "var(--color-ink-soft)", marginBottom: "12px" }}>
            Enter your numbers to get a suggested range, a 12-week forecast, and the AI negotiation chat for this deal.
            {profile?.followers_count != null && (
              <> Currently at <strong>{profile.followers_count.toLocaleString()}</strong> followers
              {profile.engagement_rate != null && <> and <strong>{profile.engagement_rate}%</strong> engagement</>}.</>
            )}
          </div>
          <RateCalculatorForm defaultViewsPerWeek={profile?.avg_views_per_week ?? undefined} busy={busy} onSubmit={createSession} />
        </div>
      ) : (
        <>
          <div className="mtile">
            <div className="lbl">Suggested range</div>
            <div className="val" style={{ fontSize: "17px" }}>{money(session.range_low)}–{money(session.range_high)}</div>
            <div style={{ fontSize: "11px", color: "var(--color-ink-faint)", marginTop: "4px" }}>
              Base rate {money(session.base_rate)} (range is base ± 15–35%)
            </div>
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--color-border)" }}>
              <div className="lbl" style={{ marginBottom: "6px" }}>Why this rate — the numbers behind it</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "12.5px" }}>
                <div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "10.5px" }}>Followers</div>
                  <div>{profile?.followers_count?.toLocaleString() ?? "—"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "10.5px" }}>Engagement rate</div>
                  <div>{profile?.engagement_rate != null ? `${profile.engagement_rate}%` : "—"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "10.5px" }}>Views/week (used)</div>
                  <div>{session.views_per_week.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "10.5px" }}>Niche CPM</div>
                  <div>₹{session.niche_cpm} / 1,000 views</div>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "10.5px" }}>Tier multiplier</div>
                  <div>{money(session.follower_tier_multiplier)}</div>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-faint)", fontSize: "10.5px" }}>Engagement adjustment</div>
                  <div>{money(session.engagement_rate_adjustment)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mtile">
            <div className="lbl" style={{ marginBottom: "2px" }}>Forecast — next 12 weeks</div>
            <div style={{ fontSize: "11px", color: "var(--color-ink-faint)", marginBottom: "8px" }}>
              Estimated negotiable rate over time, based on your recorded follower growth (see the Dashboard&apos;s
              &quot;Know your worth&quot; to log more data points). Dashed lines mark today&apos;s suggested range for comparison.
            </div>
            {forecast.length > 0 ? (
              <ForecastChart forecast={forecast} referenceLow={session.range_low} referenceHigh={session.range_high} />
            ) : (
              <div style={{ fontSize: "12px", color: "var(--color-ink-faint)" }}>Forecast unavailable.</div>
            )}
            {week12 && (
              <div style={{ fontSize: "13px", lineHeight: 1.5, marginTop: "10px" }}>
                At this pace, you&apos;ll be worth about <strong>{money(week12.mid)}</strong> by week 12 (~3 months).
                {latestBrandOffer ? (
                  week12.mid > latestBrandOffer.amount ? (
                    <> The brand&apos;s offer of {money(latestBrandOffer.amount)} is <strong>below</strong> that — you have room to negotiate up.</>
                  ) : (
                    <> That&apos;s still under the brand&apos;s offer of {money(latestBrandOffer.amount)} — their offer already looks fair.</>
                  )
                ) : null}
              </div>
            )}
          </div>

          <div className="mtile">
            <div className="lbl" style={{ marginBottom: "8px" }}>Pre-send checklist · {checklistDone}/4</div>
            <div style={{ fontSize: "12.5px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {CHECKLIST_LABELS.map(([key, label]) => (
                <div key={key} style={!session.checklist[key] ? { color: "var(--color-warning)" } : undefined}>
                  {session.checklist[key] ? "✓" : "○"}&nbsp; {label}{!session.checklist[key] ? " — not set" : ""}
                </div>
              ))}
            </div>
          </div>

          <NegotiationChat
            brandLabel={brandLabel}
            knownBrandName={knownBrandName}
            brandNameInput={brandNameInput}
            onBrandNameChange={setBrandNameInput}
            conversationText={conversationText}
            onConversationTextChange={setConversationText}
            conversations={conversations}
            busy={convoBusy}
            onSubmit={askNegotiationAi}
          />
        </>
      )}
    </div>
  );
}
