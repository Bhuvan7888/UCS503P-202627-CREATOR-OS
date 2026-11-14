"""In-memory repositories backing demo mode (same method signatures as the Supabase repositories)."""

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

from features.account.models import NotificationPreferences
from features.activity_log import ActivityLog
from features.ai_assist.models import AiKnowledge, SuggestionSet
from features.approvals.models import PublishRequest
from features.brands import Brand, BrandMember
from features.content.models import ContentItem, ContentScript
from features.contract_intelligence import ClauseCardOut, EscalationOut
from features.contracts import Contract
from features.creators import Creator
from features.crm.models import CrmDeal
from features.deals import Deal
from features.deliverables import Deliverable
from features.integrations.models import ApiKey, WebhookDelivery, WebhookEndpoint
from features.messages import Message
from features.notifications.models import Notification
from features.payments import Payment
from features.support.models import Ticket
from features.workspaces.models import AuditEntry, Invite, Workspace, WorkspaceMember, WorkspaceRole
from shared.errors import DuplicateError


# --- In-Memory Repository Implementations ---
class DemoBrandRepo:
    def __init__(self):
        self.data: dict[UUID, Brand] = {}

    async def create(self, brand: Brand) -> Brand:
        self.data[brand.id] = brand
        return brand

    async def get(self, id: UUID) -> Brand | None:
        return self.data.get(id)


class DemoBrandMemberRepo:
    def __init__(self):
        self.data: dict[UUID, BrandMember] = {}

    async def create(self, member: BrandMember) -> BrandMember:
        self.data[member.id] = member
        return member

    async def list_for_brand(self, brand_id: UUID) -> list[BrandMember]:
        return [m for m in self.data.values() if m.brand_id == brand_id]

    async def get_by_user_id(self, user_id: UUID) -> BrandMember | None:
        return next((m for m in self.data.values() if m.user_id == user_id), None)


class DemoCreatorRepo:
    def __init__(self):
        self.data: dict[UUID, Creator] = {}
        self.links: set[tuple[UUID, UUID]] = set()  # (creator_id, brand_id)
        self.brands: dict[UUID, Brand] = {}

    async def create(self, creator: Creator) -> Creator:
        self.data[creator.id] = creator
        return creator

    async def get(self, id: UUID) -> Creator | None:
        return self.data.get(id)

    async def get_by_user_id(self, user_id: UUID) -> Creator | None:
        return next((c for c in self.data.values() if c.user_id == user_id), None)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Creator]:
        matches = [
            self.data[cid] for cid, bid in self.links if bid == brand_id and cid in self.data
        ]
        return matches[offset : offset + limit]

    async def link_brand(self, creator_id: UUID, brand_id: UUID) -> None:
        self.links.add((creator_id, brand_id))

    async def is_linked_to_brand(self, creator_id: UUID, brand_id: UUID) -> bool:
        return (creator_id, brand_id) in self.links

    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        return [
            self.brands[bid] for cid, bid in self.links if cid == creator_id and bid in self.brands
        ]


class DemoDealRepo:
    def __init__(self):
        self.data: dict[UUID, Deal] = {}

    async def create(self, deal: Deal) -> Deal:
        self.data[deal.id] = deal
        return deal

    async def get(self, id: UUID) -> Deal | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Deal]:
        matches = [d for d in self.data.values() if d.brand_id == brand_id]
        matches.sort(key=lambda d: d.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deal]:
        matches = [d for d in self.data.values() if d.creator_id == creator_id]
        matches.sort(key=lambda d: d.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def update_status(self, id: UUID, status: str) -> Deal:
        deal = self.data[id]
        deal.status = status
        deal.updated_at = datetime.now(UTC)
        return deal

    async def mark_viewed(self, id: UUID) -> Deal:
        deal = self.data[id]
        deal.brand_viewed_at = datetime.now(UTC)
        return deal


class DealOwnerMap(dict):
    """deal_id -> brand_id / creator_id.

    Seeded entries win; deals created at runtime are resolved from the demo deal store, so
    contracts and deliverables on new deals show up in list views.
    """

    def __init__(self, deal_repo: "DemoDealRepo", attribute: str):
        super().__init__()
        self._deal_repo = deal_repo
        self._attribute = attribute

    def get(self, deal_id, default=None):
        if deal_id in self:
            return self[deal_id]
        deal = self._deal_repo.data.get(deal_id)
        return getattr(deal, self._attribute) if deal else default


class ContractOwnerMap(dict):
    """contract_id -> brand_id / creator_id, via the contract's deal (or a personal contract's creator).

    Seeded entries win; contracts created at runtime are resolved from the demo stores.
    """

    def __init__(
        self, contract_repo: "DemoContractRepo", deal_repo: "DemoDealRepo", attribute: str
    ):
        super().__init__()
        self._contract_repo = contract_repo
        self._deal_repo = deal_repo
        self._attribute = attribute

    def get(self, contract_id, default=None):
        if contract_id in self:
            return self[contract_id]
        contract = self._contract_repo.data.get(contract_id)
        if contract is None:
            return default
        if self._attribute == "creator_id" and getattr(contract, "creator_id", None):
            return contract.creator_id
        deal = self._deal_repo.data.get(contract.deal_id) if contract.deal_id else None
        return getattr(deal, self._attribute) if deal else default


class DemoContractRepo:
    def __init__(self):
        self.data: dict[UUID, Contract] = {}
        self.deal_brand_map: dict[UUID, UUID] = {}
        self.deal_creator_map: dict[UUID, UUID] = {}
        self.contract_creator_map: dict[UUID, UUID] = {}

    async def create(self, contract: Contract) -> Contract:
        self.data[contract.id] = contract
        if contract.creator_id:
            self.contract_creator_map[contract.id] = contract.creator_id
        return contract

    async def get(self, id: UUID) -> Contract | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]:
        matches = [c for c in self.data.values() if self.deal_brand_map.get(c.deal_id) == brand_id]
        matches.sort(key=lambda c: c.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]:
        matches = [
            c
            for c in self.data.values()
            if c.creator_id == creator_id
            or self.deal_creator_map.get(c.deal_id) == creator_id
            or self.contract_creator_map.get(c.id) == creator_id
        ]
        matches.sort(key=lambda c: c.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def update_status(self, id: UUID, status: str) -> Contract:
        contract = self.data[id]
        contract.status = status
        contract.updated_at = datetime.now(UTC)
        return contract

    async def update_status_and_previous(
        self, id: UUID, status: str, previous_status: str | None
    ) -> Contract:
        contract = self.data[id]
        contract.status = status
        contract.previous_status = previous_status
        contract.updated_at = datetime.now(UTC)
        return contract

    async def update_raw_text(self, id: UUID, raw_text: str) -> Contract:
        contract = self.data[id]
        contract.raw_text = raw_text
        contract.updated_at = datetime.now(UTC)
        return contract


class DemoDeliverableRepo:
    def __init__(self):
        self.data: dict[UUID, Deliverable] = {}
        self.deal_brand_map: dict[UUID, UUID] = {}
        self.deal_creator_map: dict[UUID, UUID] = {}

    async def create(self, deliverable: Deliverable) -> Deliverable:
        self.data[deliverable.id] = deliverable
        return deliverable

    async def get(self, id: UUID) -> Deliverable | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]:
        matches = [d for d in self.data.values() if self.deal_brand_map.get(d.deal_id) == brand_id]
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]:
        # Same rule as the Supabase repository: only deliverables on the creator's own deals.
        matches = [
            d for d in self.data.values() if self.deal_creator_map.get(d.deal_id) == creator_id
        ]
        return matches[offset : offset + limit]

    async def update_status(
        self, id: UUID, status: str, previous_status: str | None = None
    ) -> Deliverable:
        d = self.data[id]
        d.status = status
        d.previous_status = previous_status
        d.updated_at = datetime.now(UTC)
        return d


class DemoActivityLogRepo:
    def __init__(self):
        self.data: dict[UUID, ActivityLog] = {}

    async def create(self, log: ActivityLog) -> ActivityLog:
        self.data[log.id] = log
        return log

    async def get(self, id: UUID) -> ActivityLog | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ActivityLog]:
        matches = [l for l in self.data.values() if l.brand_id == brand_id]
        matches.sort(key=lambda l: l.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_deal(
        self, deal_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ActivityLog]:
        matches = [l for l in self.data.values() if l.deal_id == deal_id]
        matches.sort(key=lambda l: l.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ActivityLog]:
        return []


class DemoPaymentRepo:
    def __init__(self):
        self.data: dict[UUID, Payment] = {}
        self.contract_brand_map: dict[UUID, UUID] = {}
        self.contract_creator_map: dict[UUID, UUID] = {}

    async def create(self, payment: Payment) -> Payment:
        self.data[payment.id] = payment
        return payment

    async def get(self, id: UUID) -> Payment | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]:
        matches = [
            p for p in self.data.values() if self.contract_brand_map.get(p.contract_id) == brand_id
        ]
        matches.sort(key=lambda p: p.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]:
        matches = [
            p
            for p in self.data.values()
            if self.contract_creator_map.get(p.contract_id) == creator_id
        ]
        matches.sort(key=lambda p: p.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def mark_paid(self, id: UUID, invoice_number: str | None = None) -> Payment:
        payment = self.data[id]
        payment.status = "paid"
        if invoice_number:
            payment.invoice_number = invoice_number
        payment.updated_at = datetime.now(UTC)
        return payment

    async def update_status(self, id: UUID, status: str) -> Payment:
        p = self.data[id]
        p.status = status
        if status == "paid":
            p.paid_at = datetime.now(UTC)
        else:
            p.paid_at = None
        p.updated_at = datetime.now(UTC)
        return p


class DemoMessageRepo:
    def __init__(self):
        self.data: dict[UUID, Message] = {}

    async def create(self, msg: Message) -> Message:
        self.data[msg.id] = msg
        return msg

    async def list_for_thread(
        self, brand_id: UUID, creator_id: UUID, limit: int = 200
    ) -> list[Message]:
        matches = [
            m for m in self.data.values() if m.brand_id == brand_id and m.creator_id == creator_id
        ]
        matches.sort(key=lambda m: m.created_at)
        return matches[:limit]

    async def mark_thread_read(self, brand_id: UUID, creator_id: UUID, reader_type: str) -> int:
        now = datetime.now(UTC)
        count = 0
        for m in self.data.values():
            if m.brand_id == brand_id and m.creator_id == creator_id:
                if m.sender_type != reader_type and getattr(m, "read_at", None) is None:
                    m.read_at = now
                    count += 1
        return count

    async def get_unread_count(self, actor_type: str, actor_id: UUID) -> int:
        count = 0
        for m in self.data.values():
            if getattr(m, "read_at", None) is None:
                if (
                    actor_type == "brand" and m.brand_id == actor_id and m.sender_type == "creator"
                ) or (
                    actor_type == "creator"
                    and m.creator_id == actor_id
                    and m.sender_type == "brand"
                ):
                    count += 1
        return count

    async def get_unread_by_contact(self, actor_type: str, actor_id: UUID) -> dict[str, int]:
        counts: dict[str, int] = {}
        for m in self.data.values():
            if getattr(m, "read_at", None) is None:
                if actor_type == "brand" and m.brand_id == actor_id and m.sender_type == "creator":
                    cid = str(m.creator_id)
                    counts[cid] = counts.get(cid, 0) + 1
                elif (
                    actor_type == "creator"
                    and m.creator_id == actor_id
                    and m.sender_type == "brand"
                ):
                    bid = str(m.brand_id)
                    counts[bid] = counts.get(bid, 0) + 1
        return counts


class DemoClauseCardRepo:
    def __init__(self):
        self.data: dict[UUID, ClauseCardOut] = {}
        self.contract_brand_map: dict[UUID, UUID] = {}

    async def create(self, card: ClauseCardOut) -> ClauseCardOut:
        if not card.id or card.id == UUID(int=0):
            card.id = uuid4()
        self.data[card.id] = card
        return card

    async def get(self, id: UUID) -> ClauseCardOut | None:
        return self.data.get(id)

    async def list_for_contract(self, contract_id: UUID) -> list[ClauseCardOut]:
        return [c for c in self.data.values() if c.contract_id == contract_id]

    async def update(self, card: ClauseCardOut) -> ClauseCardOut:
        self.data[card.id] = card
        return card

    async def list_for_brand(self, brand_id: UUID) -> list[ClauseCardOut]:
        return [
            c for c in self.data.values() if self.contract_brand_map.get(c.contract_id) == brand_id
        ]


class DemoEscalationRepo:
    def __init__(self):
        self.data: dict[UUID, EscalationOut] = {}
        self.contract_brand_map: dict[UUID, UUID] = {}

    async def create(self, esc: EscalationOut) -> EscalationOut:
        self.data[esc.id] = esc
        return esc

    async def get(self, id: UUID) -> EscalationOut | None:
        return self.data.get(id)

    async def get_open_for_contract(self, contract_id: UUID) -> list[EscalationOut]:
        return [
            e for e in self.data.values() if e.contract_id == contract_id and e.status == "open"
        ]

    async def resolve(self, id: UUID, status: str, resolved_by: UUID, note: str) -> EscalationOut:
        esc = self.data[id]
        esc.status = status
        esc.resolved_by = resolved_by
        esc.resolution_note = note
        esc.resolved_at = datetime.now(UTC)
        return esc

    async def list_for_brand(self, brand_id: UUID) -> list[EscalationOut]:
        return [
            e for e in self.data.values() if self.contract_brand_map.get(e.contract_id) == brand_id
        ]


class DemoWorkspaceRepo:
    def __init__(self):
        self.data: dict[UUID, Workspace] = {}
        self.members: dict[tuple[UUID, UUID], WorkspaceMember] = {}

    async def create(self, workspace: Workspace) -> Workspace:
        # same rule as the database's unique indexes
        if any(w.slug == workspace.slug for w in self.data.values()) or (
            workspace.is_primary
            and any(
                w.is_primary and w.owner_user_id == workspace.owner_user_id
                for w in self.data.values()
            )
        ):
            raise DuplicateError("Workspace already exists")
        self.data[workspace.id] = workspace
        return workspace

    async def get(self, id: UUID) -> Workspace | None:
        return self.data.get(id)

    async def get_by_slug(self, slug: str) -> Workspace | None:
        return next((w for w in self.data.values() if w.slug == slug), None)

    async def get_primary_for_owner(self, owner_user_id: UUID) -> Workspace | None:
        return next(
            (w for w in self.data.values() if w.is_primary and w.owner_user_id == owner_user_id),
            None,
        )

    async def count_owned(self, owner_user_id: UUID) -> int:
        return sum(1 for w in self.data.values() if w.owner_user_id == owner_user_id)

    async def add_member(self, member: WorkspaceMember) -> WorkspaceMember:
        self.members[(member.workspace_id, member.user_id)] = member
        return member

    async def get_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        return self.members.get((workspace_id, user_id))

    async def list_for_user(self, user_id: UUID) -> list[tuple[Workspace, WorkspaceRole]]:
        mine = sorted(
            (m for m in self.members.values() if m.user_id == user_id), key=lambda m: m.created_at
        )
        return [(self.data[m.workspace_id], m.role) for m in mine if m.workspace_id in self.data]

    async def get_membership(
        self, ref: str, user_id: UUID
    ) -> tuple[Workspace, WorkspaceRole] | None:
        ws = next((w for w in self.data.values() if ref in (w.slug, str(w.id))), None)
        member = self.members.get((ws.id, user_id)) if ws else None
        return (ws, member.role) if ws and member else None

    async def list_members(self, workspace_id: UUID) -> list[WorkspaceMember]:
        return sorted(
            (m for m in self.members.values() if m.workspace_id == workspace_id),
            key=lambda m: m.created_at,
        )

    async def rename(self, id: UUID, name: str) -> Workspace:
        self.data[id] = self.data[id].model_copy(
            update={"name": name, "updated_at": datetime.now(UTC)}
        )
        return self.data[id]

    async def update_member_role(
        self, workspace_id: UUID, user_id: UUID, role: WorkspaceRole
    ) -> WorkspaceMember:
        key = (workspace_id, user_id)
        self.members[key] = self.members[key].model_copy(update={"role": role})
        return self.members[key]

    async def remove_member(self, workspace_id: UUID, user_id: UUID) -> None:
        self.members.pop((workspace_id, user_id), None)


class DemoTeamRepo:
    def __init__(self):
        self.invites: dict[UUID, tuple[Invite, str]] = {}
        self.permissions: dict[tuple[UUID, str], list[str]] = {}

    async def create_invite(self, invite: Invite, token_hash: str) -> Invite:
        if any(
            i.workspace_id == invite.workspace_id
            and i.email == invite.email
            and i.accepted_at is None
            for i, _ in self.invites.values()
        ):
            raise DuplicateError("An open invitation already exists")
        self.invites[invite.id] = (invite, token_hash)
        return invite

    async def get_invite_by_hash(self, token_hash: str) -> Invite | None:
        return next((i for i, h in self.invites.values() if h == token_hash), None)

    async def list_open_invites(self, workspace_id: UUID) -> list[Invite]:
        return [
            i
            for i, _ in self.invites.values()
            if i.workspace_id == workspace_id and i.accepted_at is None
        ]

    async def mark_accepted(self, invite_id: UUID, user_id: UUID, at: datetime) -> bool:
        invite, h = self.invites[invite_id]
        if invite.accepted_at is not None:
            return False
        self.invites[invite_id] = (invite.model_copy(update={"accepted_at": at}), h)
        return True

    async def delete_invite(self, invite_id: UUID) -> None:
        self.invites.pop(invite_id, None)

    async def get_role_permissions(self, workspace_id: UUID) -> dict[str, list[str]]:
        return {role: perms for (ws, role), perms in self.permissions.items() if ws == workspace_id}

    async def set_role_permissions(
        self, workspace_id: UUID, role: str, permissions: list[str]
    ) -> None:
        self.permissions[(workspace_id, role)] = permissions


class DemoAuditRepo:
    def __init__(self):
        self.entries: list[AuditEntry] = []

    async def add(self, entry: AuditEntry) -> None:
        self.entries.append(entry)

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[AuditEntry]:
        mine = [e for e in self.entries if e.workspace_id == workspace_id]
        return sorted(mine, key=lambda e: e.created_at, reverse=True)[:limit]

    async def last_open(self, workspace_id: UUID, user_id: UUID) -> datetime | None:
        opens = [
            e.created_at
            for e in self.entries
            if e.workspace_id == workspace_id
            and e.actor_user_id == user_id
            and e.action == "Opened the workspace"
        ]
        return max(opens, default=None)


class DemoUserDirectory:
    def __init__(self):
        self.renamed: dict[UUID, str] = {}

    async def set_name(self, user_id: UUID, name: str) -> None:
        self.renamed[user_id] = name

    async def describe(self, user_ids: list[UUID]) -> dict[UUID, tuple[str, str | None]]:
        from features.demo_mode.accounts import DEMO_BRANDS, DEMO_CREATORS

        known: dict[UUID, tuple[str, str | None]] = {
            UUID(str(i["user_id"])): (str(i["display_name"]), e) for e, i in DEMO_CREATORS.items()
        }
        known |= {UUID(str(i["user_id"])): (str(i["name"]), e) for e, i in DEMO_BRANDS.items()}
        known |= {u: (n, known.get(u, ("", None))[1]) for u, n in self.renamed.items()}
        return {u: known.get(u, ("Member", None)) for u in user_ids}


class DemoScriptRepo:
    def __init__(self):
        self.data: dict[UUID, ContentScript] = {}

    async def get(self, content_item_id: UUID) -> ContentScript | None:
        return self.data.get(content_item_id)

    async def upsert(self, script: ContentScript) -> ContentScript:
        self.data[script.content_item_id] = script
        return script

    async def scripted_item_ids(self, workspace_id: UUID) -> frozenset[UUID]:
        return frozenset(
            s.content_item_id
            for s in self.data.values()
            if s.workspace_id == workspace_id and s.body
        )


class DemoContentRepo:
    def __init__(self):
        self.data: dict[UUID, ContentItem] = {}

    async def create(self, item: ContentItem) -> ContentItem:
        self.data[item.id] = item
        return item

    async def get(self, id: UUID) -> ContentItem | None:
        return self.data.get(id)

    async def list_due_on(self, day: date, limit: int) -> list[ContentItem]:
        return [i for i in self.data.values() if i.due_date == day and i.stage != "published"][
            :limit
        ]

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[ContentItem]:
        items = [i for i in self.data.values() if i.workspace_id == workspace_id]
        return sorted(items, key=lambda i: i.updated_at, reverse=True)[:limit]

    async def update(self, id: UUID, changes: dict[str, Any]) -> ContentItem:
        self.data[id] = self.data[id].model_copy(update=changes)
        return self.data[id]


class DemoKnowledgeRepo:
    def __init__(self):
        self.data: dict[UUID, AiKnowledge] = {}

    async def get(self, workspace_id: UUID) -> AiKnowledge | None:
        return self.data.get(workspace_id)

    async def upsert(self, knowledge: AiKnowledge) -> AiKnowledge:
        self.data[knowledge.workspace_id] = knowledge
        return knowledge


class DemoSuggestionRepo:
    def __init__(self):
        self.data: dict[UUID, SuggestionSet] = {}

    async def get(self, workspace_id: UUID) -> SuggestionSet | None:
        return self.data.get(workspace_id)

    async def save(self, suggestions: SuggestionSet) -> SuggestionSet:
        self.data[suggestions.workspace_id] = suggestions
        return suggestions


class DemoPublishRequestRepo:
    def __init__(self):
        self.data: dict[UUID, PublishRequest] = {}

    async def create(self, request: PublishRequest) -> PublishRequest:
        if any(
            r.content_item_id == request.content_item_id and r.status == "pending"
            for r in self.data.values()
        ):
            raise DuplicateError("A pending request already exists")
        self.data[request.id] = request
        return request

    async def get(self, id: UUID) -> PublishRequest | None:
        return self.data.get(id)

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[PublishRequest]:
        mine = [r for r in self.data.values() if r.workspace_id == workspace_id]
        return sorted(mine, key=lambda r: r.created_at, reverse=True)[:limit]

    async def decide(self, id: UUID, changes: dict[str, Any]) -> PublishRequest | None:
        current = self.data.get(id)
        if current is None or current.status != "pending":
            return None
        self.data[id] = current.model_copy(update=changes)
        return self.data[id]


class DemoCrmDealRepo:
    def __init__(self):
        self.data: dict[UUID, CrmDeal] = {}

    async def create(self, deal: CrmDeal) -> CrmDeal:
        self.data[deal.id] = deal
        return deal

    async def get(self, id: UUID) -> CrmDeal | None:
        return self.data.get(id)

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[CrmDeal]:
        mine = [d for d in self.data.values() if d.workspace_id == workspace_id]
        return sorted(mine, key=lambda d: d.updated_at, reverse=True)[:limit]

    async def update(self, id: UUID, changes: dict[str, Any]) -> CrmDeal:
        self.data[id] = self.data[id].model_copy(update=changes)
        return self.data[id]

    async def delete(self, id: UUID) -> None:
        self.data.pop(id, None)


class DemoApiKeyRepo:
    def __init__(self):
        self.data: dict[UUID, tuple[ApiKey, str]] = {}

    async def create(self, key: ApiKey, key_hash: str) -> ApiKey:
        self.data[key.id] = (key, key_hash)
        return key

    async def get_by_hash(self, key_hash: str) -> ApiKey | None:
        return next((k for k, h in self.data.values() if h == key_hash), None)

    async def list_for_workspace(self, workspace_id: UUID) -> list[ApiKey]:
        return sorted(
            (k for k, _ in self.data.values() if k.workspace_id == workspace_id),
            key=lambda k: k.created_at,
            reverse=True,
        )

    async def update(self, id: UUID, changes: dict[str, Any]) -> None:
        key, h = self.data[id]
        self.data[id] = (key.model_copy(update=changes), h)


class DemoWebhookRepo:
    def __init__(self):
        self.endpoints: dict[UUID, tuple[WebhookEndpoint, str]] = {}
        self.deliveries: dict[UUID, WebhookDelivery] = {}

    async def create_endpoint(self, endpoint: WebhookEndpoint, secret: str) -> WebhookEndpoint:
        self.endpoints[endpoint.id] = (endpoint, secret)
        return endpoint

    async def list_endpoints(self, workspace_id: UUID) -> list[WebhookEndpoint]:
        return [e for e, _ in self.endpoints.values() if e.workspace_id == workspace_id]

    async def get_endpoint(self, endpoint_id: UUID) -> WebhookEndpoint | None:
        found = self.endpoints.get(endpoint_id)
        return found[0] if found else None

    async def get_secret(self, endpoint_id: UUID) -> str | None:
        found = self.endpoints.get(endpoint_id)
        return found[1] if found else None

    async def delete_endpoint(self, endpoint_id: UUID) -> None:
        self.endpoints.pop(endpoint_id, None)
        self.deliveries = {k: d for k, d in self.deliveries.items() if d.endpoint_id != endpoint_id}

    async def add_deliveries(self, deliveries: list[WebhookDelivery]) -> None:
        self.deliveries |= {d.id: d for d in deliveries}

    async def recent_deliveries(self, endpoint_id: UUID, limit: int) -> list[WebhookDelivery]:
        mine = [d for d in self.deliveries.values() if d.endpoint_id == endpoint_id]
        return sorted(mine, key=lambda d: d.created_at, reverse=True)[:limit]

    async def claim_due(
        self, now: datetime, lease_until: datetime, limit: int
    ) -> list[WebhookDelivery]:
        due = sorted(
            (
                d
                for d in self.deliveries.values()
                if d.status in ("pending", "sending") and d.next_attempt_at <= now
            ),
            key=lambda d: d.next_attempt_at,
        )[:limit]
        for d in due:
            self.deliveries[d.id] = d.model_copy(
                update={"status": "sending", "next_attempt_at": lease_until}
            )
        return [self.deliveries[d.id] for d in due]

    async def update_delivery(self, id: UUID, changes: dict[str, Any]) -> None:
        if id in self.deliveries:
            self.deliveries[id] = self.deliveries[id].model_copy(update=changes)


class DemoAccountRepo:
    def __init__(self):
        self.profiles: dict[UUID, dict[str, Any]] = {}
        self.prefs: dict[UUID, NotificationPreferences] = {}

    async def get_profile(self, user_id: UUID) -> dict[str, Any] | None:
        return self.profiles.get(user_id)

    async def save_profile(self, user_id: UUID, fields: dict[str, Any]) -> None:
        self.profiles[user_id] = fields

    async def get_preferences(self, user_id: UUID) -> NotificationPreferences | None:
        return self.prefs.get(user_id)

    async def save_preferences(self, user_id: UUID, prefs: NotificationPreferences) -> None:
        self.prefs[user_id] = prefs


class DemoNotificationRepo:
    def __init__(self):
        self.data: dict[UUID, Notification] = {}

    async def add(self, notification: Notification) -> bool:
        if notification.dedupe_key and any(
            n.user_id == notification.user_id and n.dedupe_key == notification.dedupe_key
            for n in self.data.values()
        ):
            return False
        self.data[notification.id] = notification
        return True

    def _mine(self, workspace_id: UUID, user_id: UUID) -> list[Notification]:
        return [
            n for n in self.data.values() if n.workspace_id == workspace_id and n.user_id == user_id
        ]

    async def list_for_user(
        self, workspace_id: UUID, user_id: UUID, archived: bool, limit: int
    ) -> list[Notification]:
        mine = [
            n for n in self._mine(workspace_id, user_id) if (n.archived_at is not None) == archived
        ]
        return sorted(mine, key=lambda n: n.created_at, reverse=True)[:limit]

    async def unread_count(self, workspace_id: UUID, user_id: UUID) -> int:
        return sum(
            1
            for n in self._mine(workspace_id, user_id)
            if n.read_at is None and n.archived_at is None
        )

    async def mark_read(
        self, workspace_id: UUID, user_id: UUID, ids: list[UUID] | None, at: datetime
    ) -> None:
        for n in self._mine(workspace_id, user_id):
            if n.read_at is None and (ids is None or n.id in ids):
                self.data[n.id] = n.model_copy(update={"read_at": at})

    async def archive(self, workspace_id: UUID, user_id: UUID, id: UUID, at: datetime) -> bool:
        n = self.data.get(id)
        if n is None or n.workspace_id != workspace_id or n.user_id != user_id:
            return False
        self.data[id] = n.model_copy(update={"archived_at": at, "read_at": at})
        return True


class DemoTicketRepo:
    def __init__(self):
        self.data: dict[UUID, Ticket] = {}

    async def create(self, ticket: Ticket) -> Ticket:
        self.data[ticket.id] = ticket
        return ticket

    async def get(self, id: UUID) -> Ticket | None:
        return self.data.get(id)

    async def list_for_user(self, workspace_id: UUID, user_id: UUID, limit: int) -> list[Ticket]:
        mine = [
            t for t in self.data.values() if t.workspace_id == workspace_id and t.user_id == user_id
        ]
        return sorted(mine, key=lambda t: t.created_at, reverse=True)[:limit]

    async def update(self, id: UUID, changes: dict[str, Any]) -> Ticket:
        self.data[id] = self.data[id].model_copy(update=changes)
        return self.data[id]
