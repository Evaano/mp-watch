import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { SiteShell } from "@/components/SiteShell";
import { dirOf, getDict, isLang, LANGS } from "@/lib/i18n";
import { ALLOW_INDEXING } from "@/lib/site";

const latin = Geist({ variable: "--font-latin", subsets: ["latin"] });
const latinMono = Geist_Mono({ variable: "--font-mono-latin", subsets: ["latin"] });
// MV Iyyu Normal, self-hosted. It maps real Unicode Thaana rather than the
// ASCII-codepoint scheme older MV fonts use, so it drops in without touching
// the data. Converted from the supplied OTF to WOFF2 (20KB -> 14KB).
const thaana = localFont({
  src: "../fonts/mv-iyyu-normal.woff2",
  variable: "--font-thaana",
  display: "swap",
  // Scoped to the Thaana block plus the U+FDF2 ligature. MV Iyyu also carries
  // its own ASCII glyphs, and without this restriction it claims the digits
  // too, so "MVR 10,282,000" inside Dhivehi text renders in the font's slanted
  // old-style figures while the same number renders upright in English. Every
  // codepoint outside this range now falls through to the Latin stack.
  declarations: [{ prop: "unicode-range", value: "U+0780-07BF, U+FDF2" }],
  // One name spells "Allah" with Arabic letters rather than the U+FDF2
  // ligature every other record uses. Those three characters fall through to
  // the system Arabic face, which every modern OS ships. Noto Sans Thaana is
  // not kept as a fallback because it is Thaana-only and would not cover them
  // either, so loading it would cost a request and fix nothing.
  fallback: ["system-ui", "sans-serif"],
});

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  // cover lets the footer pad itself past the home indicator on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const dict = getDict(lang);
  return {
    title: { default: dict.siteName, template: `%s | ${dict.siteName}` },
    description: dict.siteTagline,
    robots: ALLOW_INDEXING
      ? undefined
      : { index: false, follow: false, nocache: true },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body
        className={`${latin.variable} ${latinMono.variable} ${thaana.variable} bg-surface text-ink antialiased`}
      >
        <SiteShell lang={lang}>{children}</SiteShell>
      </body>
    </html>
  );
}
