// Display labels for deal pipeline stages (keys are the API's `Deal.status` values).
export const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  negotiating: "Negotiating",
  contracted: "Contracted",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};
