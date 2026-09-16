import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";
import { dict } from "@/lib/i18n";
import { ALLOW_INDEXING } from "@/lib/site";

const latin = Geist({ variable: "--font-latin", subsets: ["latin"] });
const latinMono = Geist_Mono({ variable: "--font-mono-latin", subsets: ["latin"] });

export const viewport: Viewport = {
  // cover lets the footer pad itself past the home indicator on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export const metadata: Metadata = {
  title: { default: dict.siteName, template: `%s | ${dict.siteName}` },
  description: dict.siteTagline,
  robots: ALLOW_INDEXING
    ? undefined
    : { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${latin.variable} ${latinMono.variable} bg-surface text-ink antialiased`}
      >
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
