import type { components } from "@/shared/lib/api-types";

export type CrmDeal = components["schemas"]["CrmDeal"];
export type CrmDealCreate = components["schemas"]["CrmDealCreate"];
export type CrmStats = components["schemas"]["CrmStats"];
export type PlatformDeal = components["schemas"]["PlatformDeal"];
export type CrmStatus = CrmDeal["status"];
export type Priority = CrmDeal["priority"];
export type Currency = CrmDeal["currency"];

/** Pipeline order. "Closed" = Completed or Paid. */
export const STATUSES: { value: CrmStatus; label: string; pill: string; dot: string }[] = [
  { value: "prospect", label: "Prospect", pill: "pill-neu", dot: "var(--color-ink-faint)" },
  { value: "pending", label: "Pending", pill: "pill-neu", dot: "var(--color-ink-faint)" },
  { value: "negotiating", label: "Negotiating", pill: "pill-warn", dot: "var(--color-warning)" },
  { value: "signed", label: "Signed", pill: "pill-neu", dot: "var(--color-accent)" },
  { value: "active", label: "Active", pill: "pill-neu", dot: "var(--color-accent)" },
  { value: "completed", label: "Completed", pill: "pill-ok", dot: "var(--color-success)" },
  { value: "paid", label: "Paid", pill: "pill-ok", dot: "var(--color-success)" },
  { value: "cancelled", label: "Cancelled", pill: "pill-bad", dot: "var(--color-danger)" },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.value, s])) as Record<
  CrmStatus,
  (typeof STATUSES)[number]
>;

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const CURRENCIES: Currency[] = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "AUD",
  "CAD",
  "JPY",
];

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
