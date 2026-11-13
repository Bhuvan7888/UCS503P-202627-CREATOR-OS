/** Labels for the 11 workspace permissions (the API's names are the keys). */
export const PERMISSION_INFO: { key: string; label: string; description: string }[] = [
  { key: "create_content", label: "Create Content", description: "Create and edit content items" },
  {
    key: "edit_scripts",
    label: "Edit Scripts",
    description: "Write scripts and move cards on the board",
  },
  { key: "invite_members", label: "Invite Members", description: "Send and revoke invitations" },
  {
    key: "manage_workspace",
    label: "Manage Workspace",
    description: "Rename, approve publishes, read the audit log",
  },
  { key: "view_analytics", label: "View Analytics", description: "See performance metrics" },
  {
    key: "view_brand_deals",
    label: "View Brand Deals",
    description: "Open and edit the Brand CRM",
  },
  { key: "view_dashboard", label: "View Dashboard", description: "See the Home overview" },
  { key: "view_kanban", label: "View Kanban Board", description: "See the Content Pipeline" },
  { key: "view_schedule", label: "View Schedule", description: "See the Calendar and Approvals" },
  { key: "view_scripts", label: "View Scripts", description: "Open the Scripts page" },
  { key: "view_settings", label: "View Settings", description: "Open Settings and AI knowledge" },
];

export const ROLE_INFO: Record<string, { label: string; description: string }> = {
  owner: { label: "Owner", description: "Everything, including team and permissions" },
  script_writer: { label: "Script Writer", description: "Scripts, kanban, dashboard and schedule" },
  video_editor: { label: "Video Editor", description: "Content editing and video production" },
  brand_manager: {
    label: "Brand Manager",
    description: "Brand deals CRM, dashboard, schedule and analytics",
  },
};
