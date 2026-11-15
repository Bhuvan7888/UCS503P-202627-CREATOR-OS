"""Pure rules for brand AI: prompts and clean-up of what the model returns."""

import re
from uuid import UUID

from features.brand_ai.models import BrandAiProfileSave, CreatorMatch, CreatorMatchDraft
from features.brands import Brand
from features.creators import Creator
from features.deals import Deal
from features.messages import Message

MAX_MATCHES = 5
REPLY_CONTEXT_MESSAGES = 20
MAX_BRIEF_CHARS = 20000
PLAIN_TEXT = "Plain text only: no Markdown (no **, #, tables or code blocks)."
_MARKDOWN = re.compile(r"\*\*|__|^#{1,6}\s*", re.MULTILINE)


def brand_block(brand: Brand, profile: BrandAiProfileSave | None) -> str:
    parts = [
        ("Brand", brand.name),
        ("Industry", brand.industry or ""),
        ("About", brand.description or ""),
    ]
    if profile:
        parts += [
            ("Products", profile.products),
            ("Target audience", profile.audience),
            ("Brand voice", profile.voice),
            ("Campaign goals", profile.goals),
            ("Do's and don'ts", profile.guidelines),
        ]
    return "\n".join(f"{label}: {value.strip()}" for label, value in parts if value.strip())


def creator_line(c: Creator) -> str:
    facts = [f"@{c.instagram_handle.lstrip('@')}", f"niche {c.niche}", f"tier {c.follower_tier}"]
    if c.followers_count is not None:
        facts.append(f"{c.followers_count} followers")
    if c.engagement_rate is not None:
        facts.append(f"{c.engagement_rate}% engagement")
    if c.avg_views_per_week is not None:
        facts.append(f"{c.avg_views_per_week} avg weekly views")
    return f"{c.display_name} ({', '.join(facts)})"


def brief_prompt(
    brand: Brand, profile: BrandAiProfileSave | None, deal: Deal, creator: Creator
) -> str:
    value = f"\nBudget: ₹{deal.value_inr:,.0f}" if deal.value_inr else ""
    return (
        "You are a brand partnerships manager writing a campaign brief for an influencer.\n\n"
        f"{brand_block(brand, profile)}\n\n"
        f"Campaign: {deal.campaign_name}{value}\n"
        f"Creator: {creator_line(creator)}\n\n"
        "Write a clear, practical brief the creator can act on, in plain text with these headings: "
        "Overview, Objective, Key messages, Deliverables (suggest formats that suit this creator), "
        "Do's and don'ts, Timeline, Success metrics. Keep it under 450 words. Do not invent product "
        f"claims or prices that are not given above. {PLAIN_TEXT}"
    )


def match_prompt(
    brand: Brand,
    profile: BrandAiProfileSave | None,
    campaign: str,
    roster: list[tuple[Creator, int]],
) -> str:
    lines = "\n".join(
        f"- id {c.id}: {creator_line(c)}; {deals} past deal(s) with this brand"
        for c, deals in roster
    )
    return (
        "You help a brand pick the best creators for a campaign from its roster.\n\n"
        f"{brand_block(brand, profile)}\n\n"
        f"Campaign idea: {campaign.strip()}\n\n"
        f"Roster:\n{lines}\n\n"
        f"Rank the {min(MAX_MATCHES, len(roster))} best-fitting creators. For each give creator_id "
        "(exactly as listed), score (0-100 fit) and reason (one or two sentences: audience fit, niche, "
        "reach/engagement, past work). Only use creators from the roster."
    )


def reply_prompt(
    brand: Brand, profile: BrandAiProfileSave | None, creator: Creator, thread: list[Message]
) -> str:
    recent = thread[-REPLY_CONTEXT_MESSAGES:]
    convo = "\n".join(
        f"{'Brand' if m.sender_type == 'brand' else creator.display_name}: {m.body}" for m in recent
    )
    return (
        "You draft chat replies for a brand talking to an influencer it works with.\n\n"
        f"{brand_block(brand, profile)}\n\n"
        f"Creator: {creator_line(creator)}\n\n"
        f"Conversation so far:\n{convo or '(no messages yet — write a friendly opening message)'}\n\n"
        "Write the brand's next message: friendly, professional, in the brand voice, 1-4 sentences. "
        f"Reply with the message text only. {PLAIN_TEXT}"
    )


def clean_text(text: str, limit: int) -> str:
    text = _MARKDOWN.sub("", text).strip()
    if len(text) > 1 and text[0] == text[-1] and text[0] in "\"'“”":
        text = text[1:-1].strip()
    return text[:limit]


def valid_matches(drafts: list[CreatorMatchDraft], roster: list[Creator]) -> list[CreatorMatch]:
    """Keeps only creators that are on the roster (once each), clamps scores, best first."""
    by_id = {str(c.id): c for c in roster}
    seen: set[UUID] = set()
    out: list[CreatorMatch] = []
    for d in drafts:
        c = by_id.get(d.creator_id.strip())
        if c is None or c.id in seen:
            continue
        seen.add(c.id)
        out.append(
            CreatorMatch(
                creator_id=c.id,
                display_name=c.display_name,
                score=max(0, min(100, d.score)),
                reason=d.reason.strip()[:500],
            )
        )
    return sorted(out, key=lambda m: m.score, reverse=True)[:MAX_MATCHES]
