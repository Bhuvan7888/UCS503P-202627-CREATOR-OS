import type { Metadata } from "next";
import { Inter, Fraunces, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Creator OS",
  description: "Creator OS Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${fraunces.variable} ${newsreader.variable} antialiased bg-[var(--color-canvas)] text-[var(--color-ink)]`}
      >
        {children}
      </body>
    </html>
  );
}
