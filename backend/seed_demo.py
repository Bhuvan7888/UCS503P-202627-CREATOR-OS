"""
Seeds three real-brand demo accounts (Mamaearth, Nykaa, boAt), five creator
accounts spanning multiple niches, and a dozen deals walking every deal
status, contract type, deliverable stage, and payment state the app
supports — plus growth history, AI negotiation chat, and brand<->creator
messages — so the whole platform can be clicked through end to end without
any manual setup.

These are fictional demo accounts for local testing only, not affiliated
with the real companies named.

Run from backend/, with the venv active and real Supabase credentials in
.env. Not idempotent — run reset_demo.py first if re-seeding:

    python reset_demo.py
    python seed_demo.py
"""
import asyncio
import subprocess
import tempfile
import textwrap
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

from application.services.auth import AuthService
from application.services.clause_explanation import ClauseExplanationService
from application.services.contract_intelligence import ContractIntelligenceService
from application.services.contracts import ContractService
from application.services.creators import CreatorService
from application.services.deals import DealService
from application.services.deliverables import DeliverableService
from application.services.negotiation import NegotiationService
from application.services.payments import PaymentService
from domain.models.auth import BrandSignupRequest, CreatorSignupRequest
from domain.models.contract import ContractStatusUpdateRequest
from domain.models.creator import GrowthSnapshot
from domain.models.deal import DealCreateRequest
from domain.models.deliverable import (
    DeliverableCreateRequest,
    DeliverableStatusUpdateRequest,
)
from domain.models.negotiation import (
    ChecklistState,
    NegotiationConversation,
    NegotiationSessionCreate,
)
from domain.models.payment import PaymentCreateRequest
from features.activity_log import SupabaseActivityLogRepo
from features.messages import Message, SupabaseMessageRepo
from infrastructure.email.resend_adapter import ResendAdapter
from infrastructure.pdf import extract_text
from infrastructure.supabase.contract_intelligence_repos import (
    SupabaseClauseCardRepo,
    SupabaseEscalationRepo,
)
from infrastructure.supabase.repos import (
    SupabaseBrandMemberRepo,
    SupabaseBrandRepo,
    SupabaseContractRepo,
    SupabaseCreatorRepo,
    SupabaseDealRepo,
    SupabaseDeliverableRepo,
    SupabaseGrowthSnapshotRepo,
    SupabaseNegotiationConversationRepo,
    SupabaseNegotiationSessionRepo,
    SupabasePaymentRepo,
)
from infrastructure.supabase.storage import SupabaseStorage
from shared.llm.gemini_adapter import GeminiAdapter
from shared.supabase_client import get_supabase_client

DEMO_PASSWORD = "DemoPass123!"
TODAY = date.today()


def make_contract_pdf(text: str) -> bytes:
    # cupsfilter hard-wraps any line wider than its own column width, breaking
    # mid-word ("c\nontent") regardless of the newlines already in `text`.
    # Pre-wrapping each paragraph at a narrow width means cupsfilter never
    # needs to split a line itself, so extracted text stays word-clean.
    wrapped = "\n\n".join(
        textwrap.fill(para, width=60) if para.strip() else ""
        for para in text.split("\n\n")
    )
    with tempfile.TemporaryDirectory() as tmp:
        txt_path = Path(tmp) / "contract.txt"
        txt_path.write_text(wrapped)
        result = subprocess.run(["cupsfilter", str(txt_path)], capture_output=True, check=True)
    return result.stdout


MAMAEARTH_CONTRACT = """BRAND COLLABORATION AGREEMENT — MAMAEARTH x ANANYA SHARMA

1. Usage Rights: This Agreement grants the Brand perpetual usage rights to all content
produced under this campaign, in all media, in perpetuity, without additional compensation.

2. Deliverables: Creator shall deliver one (1) Instagram Reel and two (2) Instagram Stories
featuring the Product within 14 days of contract signing.

3. Payment Terms: Payment shall be made to the Creator within 30 days of invoice submission,
in full, via bank transfer.

4. Exclusivity: Creator agrees not to promote directly competing skincare brands for a
period of 30 days from the campaign launch date, limited to the campaign category only.
"""

NYKAA_CONTRACT = """BRAND COLLABORATION AGREEMENT — NYKAA x ZARA KHAN

1. Deliverables: Creator shall deliver one (1) Instagram Reel styling three (3) looks from
the Nykaa Fashion festive edit, plus a linked shoppable story set.

2. Revisions: Creator agrees to up to two (2) rounds of revisions at the Brand's request.

3. Payment Terms: Payment shall be made to the Creator within 21 days of content going
live, in full, via bank transfer.

4. Usage Rights: Brand may use the delivered content for organic social posting and paid
whitelisting for a period of 60 days from the publish date.
"""

BOAT_CONTRACT = """BRAND COLLABORATION AGREEMENT — BOAT x KABIR ANAND

1. Deliverables: Creator shall deliver one (1) YouTube integration segment (60-90 seconds)
reviewing the Product, plus one (1) Instagram Reel.

2. Revisions: Creator agrees to unlimited revisions at the Brand's request until the Brand
is fully satisfied with the final content.

3. Payment Terms: Payment shall be made to the Creator within 15 days of content going live,
in full, via bank transfer.

4. Usage Rights: Brand may use the delivered content for organic social posting for a period
of 90 days from the publish date.
"""


async def main() -> None:
    client = get_supabase_client(service_role=True)

    def fresh_auth_service() -> AuthService:
        # A fresh client per call: AuthService.brand_signup/creator_signup both
        # end by calling sign_in_with_password, which mutates the client's own
        # session to the newly-created (non-admin) user. The cached client
        # (fresh=False, the default) is shared across every call in this
        # process, so without fresh=True that mutation leaks into the next
        # signup's admin.create_user call and gets rejected with "User not
        # allowed" — reproduced and confirmed live before this fix.
        c = get_supabase_client(service_role=True, fresh=True)
        return AuthService(c, SupabaseBrandRepo(c), SupabaseBrandMemberRepo(c), SupabaseCreatorRepo(c))

    creator_service = CreatorService(
        SupabaseCreatorRepo(client), SupabaseActivityLogRepo(client), SupabaseBrandRepo(client)
    )
    deal_repo = SupabaseDealRepo(client)
    deal_service = DealService(deal_repo, SupabaseActivityLogRepo(client))
    contract_service = ContractService(SupabaseContractRepo(client), SupabaseActivityLogRepo(client))
    negotiation_service = NegotiationService(
        SupabaseNegotiationSessionRepo(client), SupabaseActivityLogRepo(client), GeminiAdapter(), deal_repo
    )
    deliverable_service = DeliverableService(SupabaseDeliverableRepo(client), SupabaseActivityLogRepo(client))
    payment_service = PaymentService(SupabasePaymentRepo(client), SupabaseActivityLogRepo(client))
    storage = SupabaseStorage(client)
    growth_repo = SupabaseGrowthSnapshotRepo(client)
    conversation_repo = SupabaseNegotiationConversationRepo(client)
    message_repo = SupabaseMessageRepo(client)

    clause_card_repo = SupabaseClauseCardRepo(client)
    escalation_repo = SupabaseEscalationRepo(client)
    ci_service = ContractIntelligenceService(
        clause_card_repo,
        escalation_repo,
        SupabaseContractRepo(client),
        ResendAdapter(),
        ClauseExplanationService(GeminiAdapter(), clause_card_repo),
    )

    async def _with_retry(coro_fn, *args, attempts: int = 4, delay: float = 3.0):
        # Supabase's admin create_user endpoint occasionally 403s ("User not
        # allowed") when hit by rapid consecutive calls, as this script does.
        last_exc = None
        for attempt in range(attempts):
            try:
                return await coro_fn(*args)
            except Exception as e:  # noqa: BLE001 - seed script, broad catch is fine
                last_exc = e
                if attempt < attempts - 1:
                    print(f"    (retrying after transient error: {e})")
                    await asyncio.sleep(delay)
        raise last_exc

    async def create_brand(name: str, email: str) -> tuple[UUID, UUID]:
        req = BrandSignupRequest(brand_name=name, email=email, password=DEMO_PASSWORD)
        session = await _with_retry(fresh_auth_service().brand_signup, req)
        print(f"\n=== {name} ===")
        print(f"  brand login: {email} / {DEMO_PASSWORD}")
        return session.brand_id, session.user_id

    async def signup_creator(invite_code: str, **kw) -> UUID:
        req = CreatorSignupRequest(
            display_name=kw["name"], instagram_handle=kw["handle"], niche=kw["niche"],
            follower_tier=kw["tier"], followers_count=kw["followers"],
            email=kw["login_email"], password=DEMO_PASSWORD,
        )
        session = await _with_retry(fresh_auth_service().creator_signup, req)
        await creator_service.link_brand(session.creator_id, invite_code)
        await creator_service.update_profile(session.creator_id, kw["followers"], kw["engagement"], kw.get("views"))
        print(f"  creator login: {kw['login_email']} / {DEMO_PASSWORD} ({kw['name']})")
        return session.creator_id

    async def make_deal(
        brand_id: UUID, actor_id: UUID, creator_id: UUID, campaign: str, email: str, status: str,
        created_days_ago: int = 0,
    ) -> UUID:
        deal = await deal_service.create_deal(
            DealCreateRequest(creator_id=creator_id, campaign_name=campaign, contact_email=email),
            brand_id, actor_id, "brand",
        )
        if status != "lead":
            await deal_repo.update_status(deal.id, status)
        if created_days_ago:
            backdated = (datetime.now(UTC) - timedelta(days=created_days_ago)).isoformat()
            deal_repo.client.table("deals").update({"created_at": backdated}).eq("id", str(deal.id)).execute()
        return deal.id

    async def make_scanned_contract(brand_id: UUID, actor_id: UUID, deal_id: UUID, text: str) -> UUID:
        pdf_bytes = make_contract_pdf(text)
        path = f"contracts/{deal_id}/demo-agreement.pdf"
        uploaded_path = await storage.upload_file("creator-os-assets", path, pdf_bytes)
        contract = await contract_service.create_contract(deal_id, uploaded_path, brand_id, actor_id, "brand")
        extracted = extract_text(pdf_bytes)
        contract = await contract_service.save_raw_text(contract.id, extracted)
        # Gemini occasionally 503s ("high demand") — worth a few retries for
        # that. A 429 (quota exhausted) won't clear on retry though, and
        # shouldn't abort the whole reseed over one demo contract's clause
        # scan — the contract itself is already created and uploaded either way.
        try:
            clauses = await _with_retry(GeminiAdapter().segment_clauses, extracted)
            if clauses:
                await ci_service.scan_contract(contract.id, clauses)
        except Exception as e:  # noqa: BLE001 - seed script, degrade gracefully
            print(f"    (clause scan skipped — Gemini call failed: {e})")
        return contract.id

    async def make_simple_contract(brand_id: UUID, actor_id: UUID, deal_id: UUID) -> UUID:
        contract = await contract_service.create_contract(
            deal_id, f"contracts/{deal_id}/agreement.pdf", brand_id, actor_id, "brand"
        )
        await contract_service.update_status(contract.id, ContractStatusUpdateRequest(status="uploaded"), actor_id, "brand", brand_id)
        await contract_service.update_status(contract.id, ContractStatusUpdateRequest(status="signed"), actor_id, "brand", brand_id)
        return contract.id

    async def make_negotiation(brand_id, actor_id, deal_id, views, cpm, tier_mult, eng_adj, checklist_complete, offers) -> UUID:
        session = await negotiation_service.create_session(
            NegotiationSessionCreate(
                deal_id=deal_id, views_per_week=views, niche_cpm=cpm,
                follower_tier_multiplier=tier_mult, engagement_rate_adjustment=eng_adj,
            ),
        )
        if checklist_complete:
            await negotiation_service.update_checklist(session.id, ChecklistState(
                usage_rights_duration_set=True, exclusivity_scope_set=True,
                revision_limit_set=True, payment_timeline_set=True,
            ))
        for actor_type, amount, message in offers:
            await negotiation_service.create_counter_offer(
                session.id, amount, message, actor_id, actor_type
            )
        return session.id

    async def make_deliverable(brand_id, actor_id, deal_id, creator_id, title, desc, status_path):
        d = await deliverable_service.create_deliverable(
            DeliverableCreateRequest(deal_id=deal_id, title=title, description=desc), brand_id, actor_id, "brand"
        )
        # Production progress (in_production/editing/submitted) is the creator's
        # own status to report; approving/rejecting/requesting revisions is the
        # brand's review call — same split enforced server-side now.
        for status in status_path:
            if status in ("approved", "revision_requested", "rejected"):
                d = await deliverable_service.update_status(
                    d.id, DeliverableStatusUpdateRequest(status=status), actor_id, "brand", brand_id, deal_id
                )
            else:
                d = await deliverable_service.update_status(
                    d.id, DeliverableStatusUpdateRequest(status=status), creator_id, "creator", brand_id, deal_id, creator_id
                )
        return d.id

    async def make_payment(brand_id, actor_id, deal_id, contract_id, amount, due_date, paid):
        payment = await payment_service.create_payment(
            PaymentCreateRequest(contract_id=contract_id, amount_inr=amount, due_date=due_date),
            brand_id, actor_id, "brand", deal_id,
        )
        if paid:
            await payment_service.mark_paid(payment.id, brand_id, actor_id, "brand", deal_id)
        return payment.id

    async def seed_growth_history(creator_id: UUID, start_followers: int, weekly_growth: float):
        # 3 points ~4 weeks apart, compounding at weekly_growth, ending today —
        # gives the "Know your worth" forecast a real computed rate out of the box.
        for weeks_ago in (8, 4, 0):
            followers = round(start_followers * (1 + weekly_growth) ** (8 - weeks_ago))
            await growth_repo.create(GrowthSnapshot(
                id=uuid4(), creator_id=creator_id, recorded_at=TODAY - timedelta(weeks=weeks_ago),
                followers_count=followers, engagement_rate=None, created_at=datetime.now(UTC),
            ))

    async def seed_ai_conversation(session_id: UUID, brand_name: str, creator_text: str, ai_reply: str):
        await conversation_repo.create(NegotiationConversation(
            id=uuid4(), session_id=session_id, brand_name=brand_name,
            conversation_text=creator_text, ai_suggestion=ai_reply, created_at=datetime.now(UTC),
        ))

    async def seed_message_thread(brand_id: UUID, creator_id: UUID, thread: list[tuple[str, str]]):
        for sender_type, body in thread:
            await message_repo.create(Message(
                id=uuid4(), brand_id=brand_id, creator_id=creator_id,
                sender_type=sender_type, body=body, created_at=datetime.now(UTC),
            ))

    async def seed_deals(brand_id, actor_id, creator_ids, deals_spec) -> dict[str, UUID]:
        session_ids: dict[str, UUID] = {}
        for spec in deals_spec:
            deal_id = await make_deal(
                brand_id, actor_id, creator_ids[spec["creator"]], spec["campaign"], spec["email"], spec["status"],
                spec.get("created_days_ago", 0),
            )

            contract_id = None
            if spec.get("scanned_contract_text"):
                contract_id = await make_scanned_contract(brand_id, actor_id, deal_id, spec["scanned_contract_text"])
            elif spec.get("simple_contract"):
                contract_id = await make_simple_contract(brand_id, actor_id, deal_id)

            if spec.get("negotiation"):
                sid = await make_negotiation(brand_id, actor_id, deal_id, **spec["negotiation"])
                if "key" in spec:
                    session_ids[spec["key"]] = sid

            if spec.get("deliverable"):
                await make_deliverable(brand_id, actor_id, deal_id, creator_ids[spec["creator"]], **spec["deliverable"])

            if spec.get("payment") and contract_id:
                await make_payment(brand_id, actor_id, deal_id, contract_id, **spec["payment"])

            print(f"  deal: {spec['campaign']} ({spec['status']}) — done")
        return session_ids

    creator_ids: dict[str, UUID] = {}

    # --- Brand 1: Mamaearth (skincare) ------------------------------
    mamaearth_id, mamaearth_actor = await create_brand("Mamaearth", "demo.brand1@creatoros.dev")
    creator_ids["ananya"] = await signup_creator(
        str(mamaearth_id), name="Ananya Sharma", handle="@ananya.beauty", niche="beauty", tier="micro",
        followers=68000, engagement=5.2, views=21000, login_email="demo.creator1@creatoros.dev",
    )
    creator_ids["rohan"] = await signup_creator(
        str(mamaearth_id), name="Rohan Mehta", handle="@rohan.fit", niche="fitness", tier="mid",
        followers=145000, engagement=3.8, views=48000, login_email="demo.creator2@creatoros.dev",
    )
    mamaearth_sessions = await seed_deals(
        mamaearth_id, mamaearth_actor, creator_ids,
        deals_spec=[
            dict(key="ananya_glow", creator="ananya", campaign="Glow Serum Launch",
                 email="priya.nair@mamaearth.demo", status="completed", created_days_ago=55,
                 scanned_contract_text=MAMAEARTH_CONTRACT,
                 negotiation=dict(views=18000, cpm=40, tier_mult=6000, eng_adj=3000, checklist_complete=True,
                                   offers=[("creator", 13000, "Our standard ask for this scope"),
                                           ("brand", 8500, "Mamaearth's initial budget"),
                                           ("brand", 9720, "Meeting in the middle at our calculated rate")]),
                 deliverable=dict(title="Instagram Reel — Glow Serum Launch", desc="1x 30s Reel + 2 Stories",
                                   status_path=["in_production", "editing", "submitted", "approved"]),
                 payment=dict(amount=9720, due_date=TODAY - timedelta(days=10), paid=True)),
            dict(key="ananya_winter", creator="ananya", campaign="Winter Skincare Routine",
                 email="priya.nair@mamaearth.demo", status="negotiating", created_days_ago=6,
                 negotiation=dict(views=18000, cpm=30, tier_mult=4000, eng_adj=2000, checklist_complete=False,
                                   offers=[("brand", 5000, "Mamaearth's opening offer, still negotiating terms")])),
            dict(creator="rohan", campaign="Protein-Infused Face Wash", email="priya.nair@mamaearth.demo",
                 status="contracted", created_days_ago=28,
                 simple_contract=True,
                 negotiation=dict(views=40000, cpm=25, tier_mult=8000, eng_adj=3000, checklist_complete=True,
                                   offers=[("creator", 16000, "Initial ask"),
                                           ("brand", 12000, "Final agreed rate")]),
                 deliverable=dict(title="Instagram Reel — Face Wash Launch", desc="1x Reel, before/after routine",
                                   status_path=["in_production", "editing", "submitted"]),
                 payment=dict(amount=12000, due_date=TODAY - timedelta(days=3), paid=False)),
            dict(creator="rohan", campaign="Men's Grooming Kit Teaser", email="priya.nair@mamaearth.demo",
                 status="lead", created_days_ago=2),
        ],
    )

    # --- Brand 2: Nykaa (beauty & fashion marketplace) --------------
    nykaa_id, nykaa_actor = await create_brand("Nykaa", "demo.brand3@creatoros.dev")
    creator_ids["zara"] = await signup_creator(
        str(nykaa_id), name="Zara Khan", handle="@zara.style", niche="fashion", tier="micro",
        followers=42000, engagement=6.1, views=15000, login_email="demo.creator3@creatoros.dev",
    )
    # Ananya works with both brands — demonstrates the "linked brands" feature
    # showing more than one pill.
    await creator_service.link_brand(creator_ids["ananya"], str(nykaa_id))
    print("  (linked existing creator Ananya Sharma to Nykaa too)")
    nykaa_sessions = await seed_deals(
        nykaa_id, nykaa_actor, creator_ids,
        deals_spec=[
            dict(key="zara_festive", creator="zara", campaign="Festive Fashion Edit",
                 email="karan.oberoi@nykaa.demo", status="completed", created_days_ago=50,
                 scanned_contract_text=NYKAA_CONTRACT,
                 negotiation=dict(views=12000, cpm=35, tier_mult=3000, eng_adj=1500, checklist_complete=True,
                                   offers=[("creator", 6600, "Initial ask"),
                                           ("brand", 4200, "Nykaa's initial budget"),
                                           ("brand", 4920, "Final agreed rate")]),
                 deliverable=dict(title="Instagram Reel — Festive Fashion Edit", desc="3-look styled Reel + shoppable story set",
                                   status_path=["in_production", "editing", "submitted", "approved"]),
                 payment=dict(amount=4920, due_date=TODAY - timedelta(days=18), paid=True)),
            dict(key="zara_spring", creator="zara", campaign="Spring Capsule Wardrobe",
                 email="karan.oberoi@nykaa.demo", status="negotiating", created_days_ago=5,
                 negotiation=dict(views=12000, cpm=32, tier_mult=3000, eng_adj=1500, checklist_complete=False,
                                   offers=[("brand", 3600, "Nykaa's opening offer")])),
            dict(creator="zara", campaign="Last Season Denim Push", email="karan.oberoi@nykaa.demo",
                 status="cancelled", created_days_ago=70),
            dict(creator="ananya", campaign="Beauty Subscription Box Feature", email="karan.oberoi@nykaa.demo",
                 status="in_production", created_days_ago=15,
                 simple_contract=True,
                 negotiation=dict(views=20000, cpm=28, tier_mult=4000, eng_adj=2000, checklist_complete=True,
                                   offers=[("creator", 8500, "Initial ask"),
                                           ("brand", 6200, "Final agreed rate")]),
                 deliverable=dict(title="Unboxing Reel — Beauty Box", desc="1x unboxing + haul Reel",
                                   status_path=["in_production", "editing", "submitted", "revision_requested"]),
                 payment=dict(amount=6200, due_date=TODAY + timedelta(days=12), paid=False)),
        ],
    )

    # --- Brand 3: boAt (audio & electronics) -------------------------
    boat_id, boat_actor = await create_brand("boAt", "demo.brand2@creatoros.dev")
    creator_ids["kabir"] = await signup_creator(
        str(boat_id), name="Kabir Anand", handle="@kabir.tech", niche="tech", tier="mid",
        followers=112000, engagement=4.5, views=27000, login_email="demo.creator4@creatoros.dev",
    )
    creator_ids["ishita"] = await signup_creator(
        str(boat_id), name="Ishita Rao", handle="@ishita.travels", niche="travel", tier="micro",
        followers=53000, engagement=5.5, views=17000, login_email="demo.creator5@creatoros.dev",
    )
    boat_sessions = await seed_deals(
        boat_id, boat_actor, creator_ids,
        deals_spec=[
            dict(key="kabir_earbuds", creator="kabir", campaign="Wireless Earbuds Review",
                 email="arjun.mehra@boat.demo", status="completed", created_days_ago=48,
                 scanned_contract_text=BOAT_CONTRACT,
                 negotiation=dict(views=25000, cpm=45, tier_mult=7000, eng_adj=3500, checklist_complete=True,
                                   offers=[("creator", 15500, "Our standard ask"),
                                           ("brand", 9900, "boAt's initial budget"),
                                           ("brand", 11625, "Final agreed rate")]),
                 deliverable=dict(title="YouTube Review — Wireless Earbuds", desc="60-90s review + 1 Reel",
                                   status_path=["in_production", "editing", "submitted", "approved"]),
                 payment=dict(amount=11625, due_date=TODAY - timedelta(days=12), paid=True)),
            dict(key="kabir_watch", creator="kabir", campaign="Smartwatch Launch Teaser",
                 email="arjun.mehra@boat.demo", status="negotiating", created_days_ago=4,
                 negotiation=dict(views=25000, cpm=38, tier_mult=6000, eng_adj=3000, checklist_complete=False,
                                   offers=[("brand", 8000, "boAt's opening offer")])),
            dict(creator="ishita", campaign="Travel Speaker Vlog", email="arjun.mehra@boat.demo",
                 status="in_production", created_days_ago=20,
                 simple_contract=True,
                 negotiation=dict(views=15000, cpm=28, tier_mult=4000, eng_adj=2000, checklist_complete=True,
                                   offers=[("creator", 8500, "Initial ask"),
                                           ("brand", 6600, "Final agreed rate")]),
                 deliverable=dict(title="Travel Vlog — Travel Speaker", desc="1x destination vlog, 3-5 min",
                                   status_path=["in_production"]),
                 payment=dict(amount=6600, due_date=TODAY + timedelta(days=25), paid=False)),
            dict(creator="ishita", campaign="Podcast Mic Unboxing", email="arjun.mehra@boat.demo",
                 status="lead", created_days_ago=1),
        ],
    )

    # --- Growth history for all 5 creators ----------------------------
    print("\n=== Growth history ===")
    await seed_growth_history(creator_ids["ananya"], 61000, 0.012)
    await seed_growth_history(creator_ids["rohan"], 134000, 0.009)
    await seed_growth_history(creator_ids["zara"], 37000, 0.014)
    await seed_growth_history(creator_ids["kabir"], 103000, 0.008)
    await seed_growth_history(creator_ids["ishita"], 47000, 0.011)
    print("  logged 3 snapshots each for all 5 creators")

    # --- AI negotiation chat history (one active negotiation per brand) ---
    print("\n=== AI negotiation chat history ===")
    await seed_ai_conversation(
        mamaearth_sessions["ananya_winter"], "Mamaearth",
        "They offered ₹5,000 for the Winter Skincare Routine campaign but my calculated range starts higher. "
        "How should I respond?",
        "Their offer sits below your suggested range floor. Counter close to your range's midpoint and cite your "
        "recent growth — you've room to hold firm since your engagement is well above your niche's median.",
    )
    await seed_ai_conversation(
        nykaa_sessions["zara_spring"], "Nykaa",
        "Nykaa opened at ₹3,600 for the Spring Capsule Wardrobe Reel. They mentioned budget is tight this quarter.",
        "A tight-budget line is a common opener, not a ceiling — ask what specifically is driving the number before "
        "moving. If they won't budge on rate, trade scope instead: fewer looks or a shorter usage window for the same price.",
    )
    await seed_ai_conversation(
        boat_sessions["kabir_watch"], "boAt",
        "boAt offered ₹8,000 for the Smartwatch Launch Teaser. Is that fair for a mid-tier tech creator?",
        "That's roughly 30% under your suggested range. Since this is a launch teaser (high-visibility, time-sensitive "
        "for them), you have leverage — counter near your range's low end and flag the tight turnaround as added value.",
    )
    print("  seeded 1 conversation turn per brand's active negotiation")

    # --- Brand <-> creator direct messages -----------------------------
    print("\n=== Direct messages ===")
    await seed_message_thread(mamaearth_id, creator_ids["ananya"], [
        ("brand", "Hi Ananya! Loved the Glow Serum Reel — engagement's been great. Excited to kick off Winter Skincare Routine next."),
        ("creator", "Thank you! Really happy with how it turned out. Sent over my rate calculator numbers on the negotiation page."),
        ("brand", "Got it, reviewing now — will follow up there today."),
    ])
    await seed_message_thread(nykaa_id, creator_ids["zara"], [
        ("brand", "Hi Zara, the Festive Fashion Edit content is live and performing really well on our end!"),
        ("creator", "Amazing to hear! Let me know if you want any additional cutdowns for paid."),
    ])
    await seed_message_thread(boat_id, creator_ids["kabir"], [
        ("brand", "Kabir, the Wireless Earbuds review was fantastic — highest CTR we've seen from a creator partnership this quarter."),
        ("creator", "That's great news! Happy to talk about the Smartwatch teaser whenever you're ready."),
        ("brand", "Let's connect on the negotiation page — sent an opening number there."),
    ])
    print("  seeded a message thread per brand with one creator")

    print("\nDone. All demo logins use the password:", DEMO_PASSWORD)


if __name__ == "__main__":
    asyncio.run(main())
