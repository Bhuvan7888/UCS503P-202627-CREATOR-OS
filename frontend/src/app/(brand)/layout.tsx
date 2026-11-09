import React from "react";
import { AppShell } from "@/components/AppShell";

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="brand">{children}</AppShell>;
}
