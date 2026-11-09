// Display labels for deliverable statuses (keys are the API's `Deliverable.status` values).
export const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  pending: "Not started",
  in_production: "In progress",
  editing: "Video editing phase",
  submitted: "Delivered — awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
};
