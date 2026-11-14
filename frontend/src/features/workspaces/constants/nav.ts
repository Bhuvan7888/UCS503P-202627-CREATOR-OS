import {
  Bell,
  CalendarDays,
  LifeBuoy,
  Handshake,
  House,
  Inbox,
  KanbanSquare,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  /** Path below the workspace base; "" is Home. */
  path: string;
  icon: LucideIcon;
  /** Also active on deeper paths (e.g. /settings/ai-knowledge). */
  prefix?: boolean;
  /** Shown when the caller's role has any of these permissions (the API enforces the same rules). */
  anyOf?: string[];
  /** Only the workspace owner (pages backed by the owner's own creator profile). */
  ownerOnly?: boolean;
}

/** Sidebar groups. Only pages that exist are listed; later phases add notifications, etc. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ label: "Home", path: "", icon: House, anyOf: ["view_dashboard"] }],
  },
  {
    label: "Plan",
    items: [
      { label: "Content", path: "/kanban", icon: KanbanSquare, anyOf: ["view_kanban"] },
      { label: "Calendar", path: "/schedule", icon: CalendarDays, anyOf: ["view_schedule"] },
      { label: "Approvals", path: "/approvals", icon: Inbox, anyOf: ["view_schedule"] },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Scripts", path: "/scripts", icon: PenLine, anyOf: ["view_scripts"] },
      { label: "AI Assistant", path: "/ai-suggestions", icon: Sparkles, anyOf: ["create_content"] },
    ],
  },
  {
    label: "Monetize",
    items: [
      { label: "Brand CRM", path: "/crm", icon: Handshake, anyOf: ["view_brand_deals"] },
      { label: "Contracts", path: "/contracts", icon: ShieldCheck, prefix: true, ownerOnly: true },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Notifications", path: "/notifications", icon: Bell },
      // everyone has Settings (their own profile); workspace tabs inside check permissions
      { label: "Settings", path: "/settings/profile", icon: Settings, prefix: true },
      { label: "Support", path: "/support", icon: LifeBuoy },
    ],
  },
];

export const SIDEBAR_COLLAPSED_KEY = "creatoros_sidebar_collapsed";
/** An invitation token remembered across sign-in (InvitePage → /dashboard → back to the invite). */
export const PENDING_INVITE_KEY = "creatoros_pending_invite";

export function canSee(item: NavItem, role: string, permissions: string[]): boolean {
  if (item.ownerOnly) return role === "owner";
  return !item.anyOf || item.anyOf.some((p) => permissions.includes(p));
}
