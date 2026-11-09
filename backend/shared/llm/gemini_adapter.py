import logging

from google import genai
from google.genai import types

from domain.models.contract_intelligence import ClauseInput
from domain.models.negotiation import NegotiationSession
from shared.config import settings
from shared.llm.llm_port import LLMPort
from shared.money import format_inr

logger = logging.getLogger(__name__)

class GeminiAdapter(LLMPort):
    def __init__(self):
        # We assume the API key is passed directly or read from env by the SDK, 
        # but the prompt says to read it from config:
        # "Add GEMINI_API_KEY, GEMINI_MODEL_FLASH... to backend/config.py Settings"
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_MODEL_FLASH

    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str:
        prompt = (
            "Explain in plain language why the following clause might be a red flag. "
            f"The flagged reason is: {flag_reason}\n\n"
            f"Clause text: {clause_text}"
        )
        
        # Depending on whether google-genai supports async natively in this version:
        # For this prototype we will use the async client if available or wrap it.
        # google.genai has `aio` for async: `client.aio.models.generate_content`
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        
        return response.text

    async def draft_script(self, session: NegotiationSession, kind: str) -> str:
        prompt = (
            f"Draft a negotiation script for a creator. The context is {kind}. "
            f"Base rate: {format_inr(session.base_rate)}. "
            f"Range: {format_inr(session.range_low)} to {format_inr(session.range_high)}. "
            "All amounts are in Indian Rupees — always write them with the ₹ symbol exactly "
            "as given above, never $ or USD."
        )
        
        response = await self.client.aio.models.generate_content(
            # Flash, not Pro — a short, grounded advisory reply doesn't need
            # Pro's extra reasoning depth, and Flash's free-tier quota is much
            # higher, which is what actually keeps this chat feature available.
            model=settings.GEMINI_MODEL_FLASH,
            contents=prompt,
        )

        return response.text

    async def suggest_negotiation_move(
        self, session: NegotiationSession, brand_name: str, conversation_text: str,
        history: list[tuple[str, str]],
    ) -> str:
        history_block = ""
        if history:
            turns = "\n\n".join(
                f"Creator asked: {q}\nYou replied: {a}" for q, a in history
            )
            history_block = f"Earlier in this same negotiation chat:\n{turns}\n\n"

        prompt = (
            "You are a negotiation advisor chatting with a creator about their brand deal. "
            f"The brand they named is \"{brand_name}\". Before advising, use search to identify which "
            "real company this is — their industry, size, and the kind of creator campaigns they run — "
            "so your advice is grounded in who you're actually negotiating with. If this is the first "
            "message in the chat and you cannot confidently identify the brand from the name alone "
            "(too generic, several companies share it, or you find nothing credible), don't guess — ask "
            "ONE short question asking the creator to briefly describe the brand (industry / what they "
            "sell) instead, and hold off on rate advice until you know. Once you do know the brand, don't "
            "re-ask about it in later replies in the same chat.\n\n"
            f"Our data-backed base rate is {format_inr(session.base_rate)}, "
            f"with an acceptable range of {format_inr(session.range_low)} to {format_inr(session.range_high)}.\n\n"
            f"{history_block}"
            "The creator's new message:\n"
            f"{conversation_text}\n\n"
            "Reply like the next message in that chat, in 2-3 short sentences. If you have enough context "
            "(brand identity + deal specifics) to ground a specific recommendation, suggest the creator's "
            "next move — what to say or ask for next. If you don't (e.g. you don't know the deliverable, "
            "timeline, or what the brand has actually offered), don't guess — ask ONE short clarifying "
            "question instead. All amounts are in Indian Rupees — always write them with the ₹ symbol exactly as "
            "given above, never $ or USD, and never invent a figure that wasn't given to you or mentioned "
            "in the conversation."
        )

        response = await self.client.aio.models.generate_content(
            # Flash, not Pro — a short, grounded advisory reply doesn't need
            # Pro's extra reasoning depth, and Flash's free-tier quota is much
            # higher, which is what actually keeps this chat feature available.
            model=settings.GEMINI_MODEL_FLASH,
            contents=prompt,
            config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]),
        )

        return response.text

    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]:
        prompt = (
            "Split the following contract into its individual clauses. For each clause, "
            "give a short clause_type label (e.g. usage_rights, exclusivity, revisions, payment_terms, "
            "termination, confidentiality, other) and the raw_text of that clause verbatim. "
            "Return every clause in the document, in order.\n\n"
            f"Contract text:\n{contract_text}"
        )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[ClauseInput],
            ),
        )

        return response.parsed or []
