import React from "react";
import { Clock } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface ActivityItem {
  id: string;
  actor_label: string;
  action: string;
  created_at: string;
}

interface ActivityLogProps {
  activities: ActivityItem[];
}

export function ActivityLog({ activities }: ActivityLogProps) {
  if (activities.length === 0) {
    return <EmptyState icon={Clock} message="No recent activity to show." />;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-[var(--spacing-3)]">
          <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] flex items-center justify-center shrink-0">
            <span className="text-small text-[var(--color-ink-soft)] uppercase">
              {activity.actor_label.charAt(0)}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="text-body text-[var(--color-ink)]">
              <span className="font-medium">{activity.actor_label}</span> {activity.action}
            </div>
            <div className="text-small text-[var(--color-ink-faint)] mt-1">
              {new Date(activity.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
