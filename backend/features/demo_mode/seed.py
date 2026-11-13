"""Seeds the in-memory demo store with brands, creators, deals, contracts, payments and messages."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from features.brands import Brand, BrandMember
from features.contract_intelligence import ClauseCardOut
from features.contracts import Contract
from features.creators import Creator
from features.deals import Deal
from features.deliverables import Deliverable
from features.demo_mode.accounts import DEMO_BRANDS, DEMO_CREATORS
from features.messages import Message
from features.payments import Payment

if TYPE_CHECKING:
    from features.demo_mode.demo_store import DemoStore


def seed_demo_data(s: DemoStore):
    now = datetime.now(UTC)
    today = date.today()

    # Seed Brands
    for info in DEMO_BRANDS.values():
        b = Brand(
            id=info["brand_id"],
            name=info["name"],
            description=info["desc"],
            gst_number=None,
            pan_number=None,
            created_at=now,
        )
        s.brand_repo.data[b.id] = b
        s.creator_repo.brands[b.id] = b

        m = BrandMember(
            id=uuid4(),
            brand_id=b.id,
            user_id=info["user_id"],
            role="owner",
            created_at=now,
        )
        s.brand_member_repo.data[m.id] = m

    # Seed Creators
    for info in DEMO_CREATORS.values():
        c = Creator(
            id=info["creator_id"],
            brand_id=info["brand_id"],
            user_id=info["user_id"],
            display_name=info["display_name"],
            instagram_handle=info["handle"],
            niche=info["niche"],
            follower_tier=info["tier"],
            followers_count=info["followers"],
            engagement_rate=info["engagement"],
            avg_views_per_week=info["views"],
            created_at=now,
        )
        s.creator_repo.data[c.id] = c
        s.creator_repo.links.add((c.id, info["brand_id"]))

    # Ananya also linked to Nykaa
    ananya_id = DEMO_CREATORS["demo.creator1@creatoros.dev"]["creator_id"]
    nykaa_id = DEMO_BRANDS["demo.brand3@creatoros.dev"]["brand_id"]
    s.creator_repo.links.add((ananya_id, nykaa_id))

    # Helper function to add deals
    def add_deal(
        brand_id: UUID,
        creator_id: UUID,
        campaign: str,
        email: str,
        status: str,
        days_ago: int,
        val: float | None = None,
    ) -> UUID:
        deal_id = uuid4()
        created = now - timedelta(days=days_ago)
        d = Deal(
            id=deal_id,
            brand_id=brand_id,
            creator_id=creator_id,
            campaign_name=campaign,
            contact_email=email,
            status=status,
            value_inr=val,
            brand_viewed_at=created if status != "lead" else None,
            created_at=created,
            updated_at=created,
        )
        s.deal_repo.data[deal_id] = d
        s.contract_repo.deal_brand_map[deal_id] = brand_id
        s.contract_repo.deal_creator_map[deal_id] = creator_id
        s.deliverable_repo.deal_brand_map[deal_id] = brand_id
        return deal_id

    # 1. Mamaearth deals
    mama_id = DEMO_BRANDS["demo.brand1@creatoros.dev"]["brand_id"]
    rohan_id = DEMO_CREATORS["demo.creator2@creatoros.dev"]["creator_id"]

    d1 = add_deal(
        mama_id,
        ananya_id,
        "Glow Serum Launch",
        "priya.nair@mamaearth.demo",
        "completed",
        55,
        9720.0,
    )
    add_deal(
        mama_id,
        ananya_id,
        "Winter Skincare Routine",
        "priya.nair@mamaearth.demo",
        "negotiating",
        6,
        5000.0,
    )
    d3 = add_deal(
        mama_id,
        rohan_id,
        "Protein-Infused Face Wash",
        "priya.nair@mamaearth.demo",
        "contracted",
        28,
        12000.0,
    )
    add_deal(mama_id, rohan_id, "Men's Grooming Kit Teaser", "priya.nair@mamaearth.demo", "lead", 2)

    # 2. Nykaa deals
    zara_id = DEMO_CREATORS["demo.creator3@creatoros.dev"]["creator_id"]
    d4 = add_deal(
        nykaa_id,
        zara_id,
        "Festive Fashion Edit",
        "karan.oberoi@nykaa.demo",
        "completed",
        50,
        4920.0,
    )
    add_deal(
        nykaa_id,
        zara_id,
        "Spring Capsule Wardrobe",
        "karan.oberoi@nykaa.demo",
        "negotiating",
        5,
        3600.0,
    )
    add_deal(
        nykaa_id, zara_id, "Last Season Denim Push", "karan.oberoi@nykaa.demo", "cancelled", 70
    )
    d6 = add_deal(
        nykaa_id,
        ananya_id,
        "Beauty Subscription Box Feature",
        "karan.oberoi@nykaa.demo",
        "in_production",
        15,
        6200.0,
    )

    # 3. boAt deals
    boat_id = DEMO_BRANDS["demo.brand2@creatoros.dev"]["brand_id"]
    kabir_id = DEMO_CREATORS["demo.creator4@creatoros.dev"]["creator_id"]
    ishita_id = DEMO_CREATORS["demo.creator5@creatoros.dev"]["creator_id"]

    d7 = add_deal(
        boat_id,
        kabir_id,
        "Wireless Earbuds Review",
        "arjun.mehra@boat.demo",
        "completed",
        48,
        11625.0,
    )
    add_deal(
        boat_id,
        kabir_id,
        "Smartwatch Launch Teaser",
        "arjun.mehra@boat.demo",
        "negotiating",
        4,
        8000.0,
    )
    d9 = add_deal(
        boat_id,
        ishita_id,
        "Travel Speaker Vlog",
        "arjun.mehra@boat.demo",
        "in_production",
        20,
        6600.0,
    )
    add_deal(boat_id, ishita_id, "Podcast Mic Unboxing", "arjun.mehra@boat.demo", "lead", 1)

    # Deliverables
    def add_deliverable(deal_id: UUID, title: str, desc: str, status: str):
        dev_id = uuid4()
        deliv = Deliverable(
            id=dev_id,
            deal_id=deal_id,
            title=title,
            description=desc,
            status=status,
            created_at=now,
            updated_at=now,
        )
        s.deliverable_repo.data[dev_id] = deliv

    add_deliverable(d1, "Instagram Reel — Glow Serum Launch", "1x 30s Reel + 2 Stories", "approved")
    add_deliverable(
        d3, "Instagram Reel — Face Wash Launch", "1x Reel, before/after routine", "submitted"
    )
    add_deliverable(
        d4,
        "Instagram Reel — Festive Fashion Edit",
        "3-look styled Reel + shoppable story set",
        "approved",
    )
    add_deliverable(
        d6, "Unboxing Reel — Beauty Box", "1x unboxing + haul Reel", "revision_requested"
    )
    add_deliverable(d7, "YouTube Review — Wireless Earbuds", "60-90s review + 1 Reel", "approved")
    add_deliverable(
        d9, "Travel Vlog — Travel Speaker", "1x destination vlog, 3-5 min", "in_production"
    )

    # Contracts & Payments
    def add_contract_and_payment(
        deal_id: UUID,
        brand_id: UUID,
        amount: float,
        paid: bool,
        raw_text: str | None = None,
        clauses_data: list[tuple[str, str, str, str | None, str | None]] | None = None,
        status_override: str | None = None,
    ) -> UUID:
        cid = uuid4()
        deal = s.deal_repo.data.get(deal_id)
        creator_id = deal.creator_id if deal else None
        contract_status = status_override or ("signed" if paid else "uploaded")

        contract = Contract(
            id=cid,
            deal_id=deal_id,
            creator_id=creator_id,
            status=contract_status,
            previous_status=None,
            s3_path=f"contracts/{deal_id}/demo-agreement.pdf",
            usage_rights_duration_days=60,
            exclusivity_scope="category",
            revision_limit=2,
            payment_timeline_days=30,
            raw_text=raw_text or "BRAND COLLABORATION AGREEMENT - Creator OS Demo",
            creator_status="accepted" if paid else "unread",
            created_at=now,
            updated_at=now,
        )
        s.contract_repo.data[cid] = contract
        s.contract_repo.deal_brand_map[deal_id] = brand_id
        if creator_id:
            s.contract_repo.deal_creator_map[deal_id] = creator_id
            s.contract_repo.contract_creator_map[cid] = creator_id
            s.payment_repo.contract_creator_map[cid] = creator_id
        s.payment_repo.contract_brand_map[cid] = brand_id
        s.clause_card_repo.contract_brand_map[cid] = brand_id

        if clauses_data:
            for ctype, raw_clause, flag, reason, expl in clauses_data:
                card = ClauseCardOut(
                    id=uuid4(),
                    contract_id=cid,
                    clause_type=ctype,
                    raw_text=raw_clause,
                    flag=flag,
                    flag_reason_code=reason,
                    llm_explanation=expl,
                    created_at=now,
                )
                s.clause_card_repo.data[card.id] = card

        pid = uuid4()
        payment = Payment(
            id=pid,
            contract_id=cid,
            amount_inr=Decimal(str(amount)),
            platform_fee_inr=Decimal("0"),
            due_date=today - timedelta(days=10) if paid else today + timedelta(days=15),
            status="paid" if paid else "pending",
            invoice_number=f"INV-{str(pid)[:8].upper()}",
            paid_at=now - timedelta(days=10) if paid else None,
            created_at=now,
            updated_at=now,
        )
        s.payment_repo.data[pid] = payment
        return cid

    mama_ananya_text = """MAMAEARTH INFLUENCER COLLABORATION AGREEMENT
Campaign: Glow Serum Launch

1. DELIVERABLES & SCOPE
Creator agrees to produce and publish 1x 30-second Instagram Reel highlighting the Glow Serum application and 2x Instagram Stories with link stickers.

2. USAGE RIGHTS & LICENSING
Brand is granted non-exclusive commercial digital usage rights for social media channels for a duration of 60 days following publication.

3. REVISIONS POLICY
Creator agrees to provide up to two rounds of reasonable edits prior to final publication.

4. CATEGORY EXCLUSIVITY
Creator agrees not to promote competing vitamin C skincare serums during the active 3-week campaign window.

5. COMPENSATION & PAYMENT TERMS
Brand shall pay the Creator INR 9,720 within 30 days of completion and receipt of invoice."""

    mama_ananya_clauses = [
        (
            "deliverables",
            "1. DELIVERABLES & SCOPE\nCreator agrees to produce and publish 1x 30-second Instagram Reel highlighting the Glow Serum application and 2x Instagram Stories with link stickers.",
            "green",
            None,
            None,
        ),
        (
            "usage_rights",
            "2. USAGE RIGHTS & LICENSING\nBrand is granted non-exclusive commercial digital usage rights for social media channels for a duration of 60 days following publication.",
            "green",
            None,
            None,
        ),
        (
            "revisions",
            "3. REVISIONS POLICY\nCreator agrees to provide up to two rounds of reasonable edits prior to final publication.",
            "green",
            None,
            None,
        ),
        (
            "exclusivity",
            "4. CATEGORY EXCLUSIVITY\nCreator agrees not to promote competing vitamin C skincare serums during the active 3-week campaign window.",
            "green",
            None,
            None,
        ),
        (
            "payment_terms",
            "5. COMPENSATION & PAYMENT TERMS\nBrand shall pay the Creator INR 9,720 within 30 days of completion and receipt of invoice.",
            "green",
            None,
            None,
        ),
    ]

    mama_rohan_text = """MAMAEARTH BRAND COLLABORATION AGREEMENT
Campaign: Protein-Infused Face Wash

1. DELIVERABLES & TIMELINE
Creator shall produce 1x high-definition Instagram Reel showcasing the Protein-Infused Face Wash routine within 14 days of receiving product samples.

2. USAGE RIGHTS & PERPETUITY
Brand is granted irrevocable, worldwide, perpetual usage rights to the deliverables across all digital channels, paid ads, and third-party media platforms without any additional royalty fees.

3. REVISIONS & EDITING COMMITMENT
Creator agrees to provide unlimited revisions to the produced video assets until complete brand satisfaction is achieved, at no extra cost.

4. EXCLUSIVITY
Creator shall not promote or endorse competing men's grooming or skincare brands for a period of 30 days following publication.

5. COMPENSATION & TERMS
Brand agrees to pay the Creator a fee of INR 12,000 within 30 days of deliverable approval and invoice receipt."""

    mama_rohan_clauses = [
        (
            "deliverables",
            "1. DELIVERABLES & TIMELINE\nCreator shall produce 1x high-definition Instagram Reel showcasing the Protein-Infused Face Wash routine within 14 days of receiving product samples.",
            "green",
            None,
            None,
        ),
        (
            "usage_rights",
            "2. USAGE RIGHTS & PERPETUITY\nBrand is granted irrevocable, worldwide, perpetual usage rights to the deliverables across all digital channels, paid ads, and third-party media platforms without any additional royalty fees.",
            "red",
            "perpetual_usage_rights",
            "Brand acquires perpetual rights to use your content and likeness forever across all media without additional compensation or expiration date.",
        ),
        (
            "revisions",
            "3. REVISIONS & EDITING COMMITMENT\nCreator agrees to provide unlimited revisions to the produced video assets until complete brand satisfaction is achieved, at no extra cost.",
            "red",
            "unlimited_revisions",
            "Demanding unlimited revisions exposes the creator to endless rounds of rework and reshoots without compensating for additional time or effort.",
        ),
        (
            "exclusivity",
            "4. EXCLUSIVITY\nCreator shall not promote or endorse competing men's grooming or skincare brands for a period of 30 days following publication.",
            "green",
            None,
            None,
        ),
        (
            "payment_terms",
            "5. COMPENSATION & TERMS\nBrand agrees to pay the Creator a fee of INR 12,000 within 30 days of deliverable approval and invoice receipt.",
            "green",
            None,
            None,
        ),
    ]

    nykaa_ananya_text = """NYKAA BEAUTY COLLABORATION AGREEMENT
Campaign: Beauty Subscription Box Feature

1. SCOPE OF DELIVERABLES
Creator will post 1x unboxing video and haul review on Instagram showcasing the featured subscription items.

2. WHITELISTING & BOOSTING
Brand reserves the right to run unpaid whitelisting/boosting ads through Creator's account without supplementary compensation.

3. REVISIONS
Creator shall provide standard revisions within 48 hours of draft submission.

4. COMPENSATION
Creator shall receive INR 6,200 upon satisfactory completion of deliverables."""

    nykaa_ananya_clauses = [
        (
            "deliverables",
            "1. SCOPE OF DELIVERABLES\nCreator will post 1x unboxing video and haul review on Instagram showcasing the featured subscription items.",
            "green",
            None,
            None,
        ),
        (
            "usage_rights",
            "2. WHITELISTING & BOOSTING\nBrand reserves the right to run unpaid whitelisting/boosting ads through Creator's account without supplementary compensation.",
            "red",
            "unpaid_whitelisting",
            "Allows the brand to run paid ads and boosting through your creator account handle without paying a whitelisting access fee.",
        ),
        (
            "revisions",
            "3. REVISIONS\nCreator shall provide standard revisions within 48 hours of draft submission.",
            "green",
            None,
            None,
        ),
        (
            "payment_terms",
            "4. COMPENSATION\nCreator shall receive INR 6,200 upon satisfactory completion of deliverables.",
            "green",
            None,
            None,
        ),
    ]

    add_contract_and_payment(
        d1, mama_id, 9720.0, True, raw_text=mama_ananya_text, clauses_data=mama_ananya_clauses
    )
    add_contract_and_payment(
        d3, mama_id, 12000.0, False, raw_text=mama_rohan_text, clauses_data=mama_rohan_clauses
    )
    add_contract_and_payment(
        d4,
        nykaa_id,
        4920.0,
        True,
        raw_text="NYKAA FASHION COLLABORATION AGREEMENT\n1. DELIVERABLES: 3-look styled Reel.\n2. USAGE RIGHTS: 45 days.\n3. REVISIONS: Up to 2 rounds.\n4. COMPENSATION: INR 4,920.",
        clauses_data=[
            ("deliverables", "1. DELIVERABLES: 3-look styled Reel.", "green", None, None),
            ("usage_rights", "2. USAGE RIGHTS: 45 days.", "green", None, None),
            ("revisions", "3. REVISIONS: Up to 2 rounds.", "green", None, None),
            ("payment_terms", "4. COMPENSATION: INR 4,920.", "green", None, None),
        ],
    )
    add_contract_and_payment(
        d6, nykaa_id, 6200.0, False, raw_text=nykaa_ananya_text, clauses_data=nykaa_ananya_clauses
    )
    add_contract_and_payment(
        d7,
        boat_id,
        11625.0,
        True,
        raw_text="BOAT DIGITAL CREATOR AGREEMENT\n1. DELIVERABLES: 60-90s dedicated YouTube review and 1 Instagram Reel.\n2. USAGE RIGHTS: 90 days digital license.\n3. REVISIONS: 1 round.\n4. COMPENSATION: INR 11,625.",
        clauses_data=[
            (
                "deliverables",
                "1. DELIVERABLES: 60-90s dedicated YouTube review and 1 Instagram Reel.",
                "green",
                None,
                None,
            ),
            ("usage_rights", "2. USAGE RIGHTS: 90 days digital license.", "green", None, None),
            ("revisions", "3. REVISIONS: 1 round.", "green", None, None),
            ("payment_terms", "4. COMPENSATION: INR 11,625.", "green", None, None),
        ],
    )
    add_contract_and_payment(
        d9,
        boat_id,
        6600.0,
        False,
        raw_text="BOAT ADVENTURE COLLABORATION AGREEMENT\n1. DELIVERABLES: 1x destination vlog integration (3-5 minutes).\n2. USAGE RIGHTS: 60 days digital usage.\n3. REVISIONS: Up to 2 revisions.\n4. COMPENSATION: INR 6,600.",
        clauses_data=[
            (
                "deliverables",
                "1. DELIVERABLES: 1x destination vlog integration (3-5 minutes).",
                "green",
                None,
                None,
            ),
            ("usage_rights", "2. USAGE RIGHTS: 60 days digital usage.", "green", None, None),
            ("revisions", "3. REVISIONS: Up to 2 revisions.", "green", None, None),
            ("payment_terms", "4. COMPENSATION: INR 6,600.", "green", None, None),
        ],
    )

    # Messages
    def add_msg(b_id: UUID, c_id: UUID, sender: str, text: str):
        mid = uuid4()
        msg = Message(
            id=mid,
            brand_id=b_id,
            creator_id=c_id,
            sender_type=sender,
            body=text,
            created_at=now,
        )
        s.message_repo.data[mid] = msg

    add_msg(
        mama_id,
        ananya_id,
        "brand",
        "Hi Ananya! Loved the Glow Serum Reel — engagement has been great.",
    )
    add_msg(mama_id, ananya_id, "creator", "Thank you! Really happy with how it turned out.")
    add_msg(
        mama_id, rohan_id, "brand", "Hey Rohan, let us know when the travel vlog draft is ready!"
    )
    add_msg(
        nykaa_id,
        zara_id,
        "brand",
        "Hi Zara, the Festive Fashion Edit content is live and performing really well!",
    )
    add_msg(
        boat_id,
        kabir_id,
        "brand",
        "Kabir, the Wireless Earbuds review was fantastic — highest CTR this quarter.",
    )
