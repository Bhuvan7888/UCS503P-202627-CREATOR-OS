import logging
from datetime import UTC, datetime
from uuid import UUID

from features.ai_assist import AIUnavailableError, RateLimitedError, RateLimiter
from features.brand_ai.models import (
    BrandAiProfile,
    BrandAiProfileSave,
    BriefSave,
    CreatorMatchDraft,
    DealBrief,
    GeneratedText,
    MatchRequest,
    MatchResult,
)
from features.brand_ai.repository import BrandAiProfileRepo, DealBriefRepo
from features.brand_ai.rules import (
    MAX_BRIEF_CHARS,
    brief_prompt,
    clean_text,
    match_prompt,
    reply_prompt,
    valid_matches,
)
from features.brands import Brand, BrandRepo
from features.creators import Creator, CreatorRepo
from features.deals import Deal, DealRepo
from features.messages import MessageRepo
from shared.errors import NotFoundError, ValidationError
from shared.llm.llm_port import LLMPort, LLMRateLimitError

logger = logging.getLogger(__name__)

ROSTER_SCAN_LIMIT = 200
MAX_REPLY_CHARS = 2000


class BrandAiService:
    """AI help for brands: AI knowledge, campaign briefs, creator matching and chat reply drafts."""

    def __init__(
        self,
        profile_repo: BrandAiProfileRepo,
        brief_repo: DealBriefRepo,
        brand_repo: BrandRepo,
        creator_repo: CreatorRepo,
        deal_repo: DealRepo,
        message_repo: MessageRepo,
        llm: LLMPort | None,
        limiter: RateLimiter,
    ):
        self.profile_repo = profile_repo
        self.brief_repo = brief_repo
        self.brand_repo = brand_repo
        self.creator_repo = creator_repo
        self.deal_repo = deal_repo
        self.message_repo = message_repo
        self.llm = llm
        self.limiter = limiter

    async def get_profile(self, brand_id: UUID) -> BrandAiProfile:
        return await self.profile_repo.get(brand_id) or BrandAiProfile(brand_id=brand_id)

    async def save_profile(self, brand_id: UUID, request: BrandAiProfileSave) -> BrandAiProfile:
        return await self.profile_repo.upsert(
            BrandAiProfile(brand_id=brand_id, updated_at=datetime.now(UTC), **request.model_dump())
        )

    async def get_brief(self, deal: Deal) -> DealBrief | None:
        return await self.brief_repo.get(deal.id)

    async def save_brief(self, deal: Deal, request: BriefSave) -> DealBrief:
        return await self.brief_repo.save(
            DealBrief(
                deal_id=deal.id,
                brand_id=deal.brand_id,
                content=request.content.strip(),
                updated_at=datetime.now(UTC),
            )
        )

    async def generate_brief(self, deal: Deal) -> GeneratedText:
        llm = self._take_call(deal.brand_id)
        brand, profile = await self._brand(deal.brand_id)
        creator = await self._creator(deal.creator_id)
        text = await self._ask(llm.write, brief_prompt(brand, profile, deal, creator))
        return GeneratedText(text=clean_text(text, MAX_BRIEF_CHARS))

    async def match(self, brand_id: UUID, request: MatchRequest) -> MatchResult:
        roster = await self.creator_repo.list_for_brand(brand_id, ROSTER_SCAN_LIMIT, 0)
        if not roster:
            raise ValidationError("Add or connect creators first — matching ranks your roster")
        llm = self._take_call(brand_id)
        brand, profile = await self._brand(brand_id)
        deals = await self.deal_repo.list_for_brand(brand_id, ROSTER_SCAN_LIMIT, 0)
        counts = {c.id: sum(1 for d in deals if d.creator_id == c.id) for c in roster}
        prompt = match_prompt(brand, profile, request.campaign, [(c, counts[c.id]) for c in roster])
        drafts = await self._ask(llm.write_structured, prompt, list[CreatorMatchDraft])
        return MatchResult(matches=valid_matches(drafts, roster))

    async def draft_reply(self, brand_id: UUID, creator_id: UUID) -> GeneratedText:
        if not await self.creator_repo.is_linked_to_brand(creator_id, brand_id):
            raise NotFoundError("Creator not found")
        llm = self._take_call(brand_id)
        brand, profile = await self._brand(brand_id)
        creator = await self._creator(creator_id)
        thread = await self.message_repo.list_for_thread(brand_id, creator_id)
        text = await self._ask(llm.write, reply_prompt(brand, profile, creator, thread))
        return GeneratedText(text=clean_text(text, MAX_REPLY_CHARS))

    async def _brand(self, brand_id: UUID) -> tuple[Brand, BrandAiProfile | None]:
        brand = await self.brand_repo.get(brand_id)
        if brand is None:
            raise NotFoundError("Brand not found")
        return brand, await self.profile_repo.get(brand_id)

    async def _creator(self, creator_id: UUID) -> Creator:
        creator = await self.creator_repo.get(creator_id)
        if creator is None:
            raise NotFoundError("Creator not found")
        return creator

    def _take_call(self, brand_id: UUID) -> LLMPort:
        if self.llm is None:
            raise AIUnavailableError
        if not self.limiter.allow(brand_id, datetime.now(UTC)):
            raise RateLimitedError("Too many AI requests. Try again in a few minutes.")
        return self.llm

    @staticmethod
    async def _ask(call, *args):
        try:
            return await call(*args)
        except LLMRateLimitError as e:
            raise RateLimitedError(str(e)) from e
        except Exception as e:
            logger.warning("Brand AI call failed: %s", e)
            raise AIUnavailableError from e
