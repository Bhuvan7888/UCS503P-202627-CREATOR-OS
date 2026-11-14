import type { components } from "@/shared/lib/api-types";

export type Notification = components["schemas"]["Notification"];
export type Category = Notification["category"];

export const CATEGORY_INFO: Record<Category, { label: string; description: string }> = {
  task_assignments: {
    label: "Task Assignments",
    description: "When you are assigned to work on content",
  },
  publishing_updates: {
    label: "Publishing Updates",
    description: "Publishes waiting for approval, approved or rejected",
  },
  deadlines: { label: "Deadlines & Reminders", description: "Content due tomorrow" },
  workspace_activity: { label: "Workspace Activity", description: "Team member changes" },
};

export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** How often the bell refreshes its unread count. */
export const UNREAD_POLL_MS = 60_000;
/** Window event the inbox fires after read/archive so the bell updates at once. */
export const NOTIFICATIONS_CHANGED = "creatoros:notifications-changed";

export function announceNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}
