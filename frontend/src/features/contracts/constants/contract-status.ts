// Display labels for contract statuses (keys are the API's `Contract.status` values).
export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  uploaded: "Pending acceptance",
  signed: "Accepted",
  draft: "Draft",
  void: "Void",
  pending_review: "Pending review",
};

/** Statuses a brand can set by hand; `pending_review` is set by the red-flag clause scan. */
export const CONTRACT_STATUS_OPTIONS = ["uploaded", "signed", "draft", "void"] as const;
