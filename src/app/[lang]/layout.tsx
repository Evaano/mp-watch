import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thaana } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { SiteShell } from "@/components/SiteShell";
import { dirOf, getDict, isLang, LANGS } from "@/lib/i18n";

const latin = Geist({ variable: "--font-latin", subsets: ["latin"] });
const latinMono = Geist_Mono({ variable: "--font-mono-latin", subsets: ["latin"] });
const thaana = Noto_Sans_Thaana({ variable: "--font-thaana", subsets: ["thaana"] });

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
