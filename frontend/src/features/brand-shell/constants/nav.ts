import {
  Activity,
  FileText,
  Handshake,
  House,
  MessageCircle,
  Package,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface BrandNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Also active on deeper paths (e.g. /deals/<id>). */
  prefix?: boolean;
}

/** Brand sidebar, grouped like the creator workspace sidebar. */
export const BRAND_NAV: { label: string; items: BrandNavItem[] }[] = [
  { label: "Overview", items: [{ label: "Home", href: "/brand", icon: House }] },
  {
    label: "Partnerships",
    items: [
      { label: "Deals", href: "/deals", icon: Handshake, prefix: true },
      { label: "Creators", href: "/creators", icon: Users, prefix: true },
      { label: "Chat", href: "/chat", icon: MessageCircle },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Contracts", href: "/contracts", icon: FileText, prefix: true },
      { label: "Deliverables", href: "/deliverables", icon: Package },
      { label: "Payments", href: "/payments", icon: Receipt },
    ],
  },
  { label: "Account", items: [{ label: "Activity", href: "/activity", icon: Activity }] },
];

export const BRAND_HOME = "/brand";

export function isActive(item: BrandNavItem, pathname: string): boolean {
  return pathname === item.href || (!!item.prefix && pathname.startsWith(`${item.href}/`));
}
