"""Pure rules for AI assistance: prompts, output clean-up, cache freshness and the rate limit."""

from collections import deque
from datetime import datetime, timedelta
from uuid import UUID

from features.ai_assist.models import AiKnowledgeSave, ContentDraft, GenerateField, Suggestion

SUGGESTIONS_TTL = timedelta(hours=24)
SUGGESTION_COUNT = 6
RECENT_TITLES_FOR_CONTEXT = 20
# Max length of a generated value per field (matches the content item limits).
FIELD_LIMITS: dict[GenerateField, int] = {
    "title": 200,
    "description": 2000,
    "hook": 500,
    "outline": 50_000,
}
AI_CALLS_PER_WINDOW = 30
AI_CALL_WINDOW = timedelta(minutes=10)

_INSTRUCTIONS: dict[GenerateField, str] = {
    "title": "Write one catchy title (max 12 words). Reply with the title only, no quotes.",
    "description": "Write a 2-3 sentence description of the piece. Reply with the description only.",
    "hook": "Write one engaging opening line that stops the scroll. Reply with the line only.",
    "outline": (
        "Write a script outline: a hook, 3-6 sections with bullet points, and a call to action. "
        "Use plain text with simple headings."
    ),
}


def knowledge_block(k: AiKnowledgeSave | None) -> str:
    if k is None:
        return ""
    parts = [
        ("Brand", k.brand),
        ("Audience", k.audience),
        ("Content strategy", k.strategy),
        ("Required output format", k.custom_output_format),
    ]
    lines = [f"{label}: {value.strip()}" for label, value in parts if value.strip()]
    return "About this creator's workspace:\n" + "\n".join(lines) + "\n\n" if lines else ""


def draft_block(d: ContentDraft) -> str:
    parts = [
        ("Content type", d.type.replace("_", " ")),
        ("Title", d.title),
        ("Description", d.description or ""),
        ("Content pillar", d.pillar),
        ("Hook", d.hook),
    ]
    return "\n".join(f"{label}: {value.strip()}" for label, value in parts if value.strip())


def generate_prompt(field: GenerateField, draft: ContentDraft, k: AiKnowledgeSave | None) -> str:
    return (
        "You help a social media creator plan content.\n\n"
        f"{knowledge_block(k)}"
        f"The piece so far:\n{draft_block(draft)}\n\n"
        f"{_INSTRUCTIONS[field]}"
    )


def suggestions_prompt(k: AiKnowledgeSave | None, recent_titles: list[str]) -> str:
    recent = "\n".join(f"- {t}" for t in recent_titles) or "- (none yet)"
    return (
        "You help a social media creator plan content.\n\n"
        f"{knowledge_block(k)}"
        f"Their recent content:\n{recent}\n\n"
        f"Suggest {SUGGESTION_COUNT} new content ideas that fit the workspace and do not repeat the "
        "recent content. For each give a title (max 12 words), a 1-2 sentence description, a content "
        "pillar (1-3 words), a hook (one opening line) and the best content type."
    )


def clean_generated(text: str, field: GenerateField) -> str:
    text = text.strip()
    if field != "outline" and len(text) > 1 and text[0] == text[-1] and text[0] in "\"'“”":
        text = text[1:-1].strip()
    return text[: FIELD_LIMITS[field]]


def is_fresh(generated_at: datetime | None, now: datetime) -> bool:
    return generated_at is not None and now - generated_at < SUGGESTIONS_TTL


def visible(suggestions: list[Suggestion]) -> list[Suggestion]:
    return [s for s in suggestions if not s.dismissed]


class RateLimiter:
    """Sliding-window limit of AI calls per workspace.

    ponytail: in-process memory — each backend instance counts separately; move to Redis or a DB
    counter if the API runs on several instances.
    """

    def __init__(self, limit: int = AI_CALLS_PER_WINDOW, window: timedelta = AI_CALL_WINDOW):
        self.limit = limit
        self.window = window
        self.calls: dict[UUID, deque[datetime]] = {}

    def allow(self, workspace_id: UUID, now: datetime) -> bool:
        calls = self.calls.setdefault(workspace_id, deque())
        while calls and now - calls[0] >= self.window:
            calls.popleft()
        if len(calls) >= self.limit:
            return False
        calls.append(now)
        return True
