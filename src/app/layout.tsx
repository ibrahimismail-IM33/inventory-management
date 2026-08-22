import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WAQT — Expiry & Supplier Returns",
  description:
    "Track product expiry by batch, get alerts before stock expires, and recover money from suppliers on expired stock.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
