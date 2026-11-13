import { House, KanbanSquare, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  /** Path below the workspace base; "" is Home. */
  path: string;
  icon: LucideIcon;
}

/** Sidebar groups. Only pages that exist are listed; later phases add Calendar, Scripts, Brand CRM, etc. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ label: "Home", path: "", icon: House }] },
  { label: "Plan", items: [{ label: "Content", path: "/kanban", icon: KanbanSquare }] },
];

export const SIDEBAR_COLLAPSED_KEY = "creatoros_sidebar_collapsed";
