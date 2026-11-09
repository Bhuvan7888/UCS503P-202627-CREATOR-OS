import React from "react";
import { AppShell } from "@/app/_shell/AppShell";

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="brand">{children}</AppShell>;
}
