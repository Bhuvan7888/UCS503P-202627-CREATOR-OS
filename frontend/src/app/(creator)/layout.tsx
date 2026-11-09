import React from "react";
import { AppShell } from "@/app/_shell/AppShell";

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="creator">{children}</AppShell>;
}
