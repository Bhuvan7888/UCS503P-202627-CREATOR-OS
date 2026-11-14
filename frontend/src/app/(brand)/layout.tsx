import React from "react";
import BrandShell from "@/features/brand-shell/BrandShell";

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <BrandShell>{children}</BrandShell>;
}
