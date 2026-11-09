import type { StatusVariant } from "@/shared/components/ui/StatusPill";
import type { components } from "@/shared/lib/api-types";

type Deliverable = components["schemas"]["Deliverable"];

// Intentionally differs from the shared dealStatusVariant (contracted/in_production are "accent" here).
export function dealStageVariant(status: string): StatusVariant {
  switch (status) {
    case "negotiating": return "warning";
    case "contracted": return "accent";
    case "in_production": return "accent";
    case "completed": return "success";
    case "cancelled": return "danger";
    default: return "neutral";
  }
}

export function getAvailableStatuses(d: Deliverable): { value: string; label: string }[] {
  const options = [
    { value: "pending", label: "Not started" },
    { value: "in_production", label: "In progress" },
    { value: "editing", label: "Video editing phase" },
    { value: "submitted", label: "Delivered — awaiting approval" },
  ];

  if (d.status === "revision_requested" || d.previous_status === "revision_requested") {
    options.push({ value: "revision_requested", label: "Revision requested" });
  }

  return options;
}

export function getBrandAvailableStatuses(d: Deliverable): { value: string; label: string }[] {
  const options = [
    { value: "in_production", label: "In progress" },
    { value: "submitted", label: "Delivered — awaiting approval" },
    { value: "approved", label: "Approved" },
    { value: "revision_requested", label: "Revision requested" },
    { value: "rejected", label: "Rejected" },
  ];
  if (d.status === "pending") {
    options.unshift({ value: "pending", label: "Not started" });
  }
  if (d.status === "editing") {
    options.splice(2, 0, { value: "editing", label: "Video editing phase" });
  }
  return options;
}

export function deliverableStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "danger";
    case "revision_requested": return "warning";
    case "submitted": return "accent";
    default: return "neutral";
  }
}
