import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <p style={{ fontFamily: "monospace", fontSize: 48, color: "var(--color-accent)", margin: 0 }}>
        404
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>We can&apos;t find that page</h1>
      <p style={{ color: "var(--color-ink-soft)", margin: 0 }}>
        The link may be broken, or the page may have moved.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Link href="/dashboard" className="btn btn-outline">
          Go to dashboard
        </Link>
        <Link href="/" className="btn">
          Back to home
        </Link>
      </div>
    </main>
  );
}
