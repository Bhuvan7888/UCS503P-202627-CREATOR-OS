import type { StatusVariant } from "@/shared/components/ui/StatusPill";

// Pill colours for API statuses that are shown the same way on several pages.
// Pages that deliberately colour a status differently keep their own local mapping.

export function contractStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "signed":
      return "success";
    case "pending_review":
      return "warning";
    case "void":
      return "danger";
    default:
      return "neutral";
  }
}

export function dealStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "negotiating":
      return "warning";
    case "contracted":
      return "success";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function paymentStatusVariant(status: string): StatusVariant {
  return status === "paid" ? "success" : status === "overdue" ? "danger" : "warning";
}
