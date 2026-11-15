from datetime import UTC, datetime
from uuid import uuid4

from features.brand_ai.models import CreatorMatchDraft, TrackRecord
from features.brand_ai.rules import (
    MAX_MATCHES,
    clean_text,
    track_record,
    track_record_text,
    valid_matches,
)
from features.creators import Creator
from features.deals import Deal
from features.deliverables import Deliverable


def _creator(name: str) -> Creator:
    return Creator(
        id=uuid4(),
        display_name=name,
        instagram_handle=name.lower(),
        niche="beauty",
        follower_tier="micro",
        created_at=datetime.now(UTC),
    )


def _deal(creator: Creator, status: str) -> Deal:
    now = datetime.now(UTC)
    return Deal(
        id=uuid4(),
        brand_id=uuid4(),
        creator_id=creator.id,
        campaign_name="C",
        contact_email="a@b.c",
        status=status,
        created_at=now,
        updated_at=now,
    )


def _deliverable(deal: Deal, status: str, previous: str | None) -> Deliverable:
    now = datetime.now(UTC)
    return Deliverable(
        id=uuid4(),
        deal_id=deal.id,
        title="T",
        description="D",
        status=status,
        previous_status=previous,
        created_at=now,
        updated_at=now,
    )


def test_valid_matches_dedupes_clamps_sorts_caps_and_adds_data_confidence() -> None:
    roster = [_creator(f"C{i}") for i in range(7)]
    drafts = [
        CreatorMatchDraft(creator_id=str(c.id), score=10 * i, reason=" r ")
        for i, c in enumerate(roster)
    ]
    drafts.append(CreatorMatchDraft(creator_id=str(roster[0].id), score=-5, reason="dup"))
    out = valid_matches(drafts, roster, {}, datetime.now(UTC))
    assert len(out) == MAX_MATCHES and [m.score for m in out] == [60, 50, 40, 30, 20]
    assert out[0].reason == "r" and out[0].track_record == "No deals with you yet"
    assert out[0].confidence == "low" and out[0].data_note == "No follower numbers on file"


def test_track_record_counts_real_outcomes() -> None:
    creator, other = _creator("A"), _creator("B")
    deals = [_deal(creator, "completed"), _deal(creator, "cancelled"), _deal(other, "completed")]
    work = [
        _deliverable(deals[0], "approved", None),
        _deliverable(deals[0], "approved", "revision_requested"),
        _deliverable(deals[1], "rejected", "submitted"),
        _deliverable(deals[2], "approved", None),  # someone else's
    ]
    t = track_record(creator, deals, work)
    assert (t.deals, t.completed, t.cancelled) == (2, 1, 1)
    assert (t.deliverables, t.approved, t.needed_revisions) == (3, 2, 2)
    assert track_record_text(t) == (
        "2 deals (1 completed, 1 cancelled) · 3 deliverables (2 approved, 2 needed revisions)"
    )
    assert track_record_text(TrackRecord(deals=1, completed=1)) == "1 deal (1 completed)"
    # work still under way reads as "in progress", never as a failure
    assert track_record_text(TrackRecord(deals=2, deliverables=1)) == (
        "2 deals (0 completed, 2 in progress) · 1 deliverable (0 approved, 1 in progress)"
    )


def test_clean_text_strips_quotes_and_caps() -> None:
    assert clean_text('  "Hello"  ', 100) == "Hello"
    assert clean_text("abcdef", 3) == "abc"
    assert (
        clean_text("## Overview\n**Objective** grow __reach__", 100)
        == "Overview\nObjective grow reach"
    )
