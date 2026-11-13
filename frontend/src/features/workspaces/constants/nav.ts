import {
  CalendarDays,
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
}

/** Sidebar groups. Only pages that exist are listed; later phases add team, notifications, etc. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ label: "Home", path: "", icon: House }] },
  {
    label: "Plan",
    items: [
      { label: "Content", path: "/kanban", icon: KanbanSquare },
      { label: "Calendar", path: "/schedule", icon: CalendarDays },
      { label: "Approvals", path: "/approvals", icon: Inbox },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Scripts", path: "/scripts", icon: PenLine },
      { label: "AI Assistant", path: "/ai-suggestions", icon: Sparkles },
    ],
  },
  {
    label: "Monetize",
    items: [
      { label: "Brand CRM", path: "/crm", icon: Handshake },
      { label: "Contracts", path: "/contracts", icon: ShieldCheck, prefix: true },
    ],
  },
  {
    label: "Workspace",
    items: [{ label: "Settings", path: "/settings/ai-knowledge", icon: Settings, prefix: true }],
  },
];

export const SIDEBAR_COLLAPSED_KEY = "creatoros_sidebar_collapsed";
