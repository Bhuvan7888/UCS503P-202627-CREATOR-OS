import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>{children}</div>;
}
