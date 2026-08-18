import Link from "next/link";
import { BackToTop } from "./BackToTop";
import type { ReactNode } from "react";
import { registry } from "@/lib/registry";
import { href } from "@/lib/format";
import { getDict, LANG_LABEL, otherLang, type Lang } from "@/lib/i18n";

/** Header, footer and page frame. Every route renders inside this. */
export function SiteShell({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  const dict = getDict(lang);
  const alt = otherLang(lang);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Sticky so the language switch and the way back stay reachable while
          scrolling a long member list on a phone. */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:h-16">
          <Link
            href={href(lang)}
            className="text-base font-semibold tracking-tight sm:text-lg"
          >
            {dict.siteName}
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={href(lang)}
              className="flex min-h-11 items-center rounded-card px-3 hover:text-accent-ink"
            >
              {dict.navMembers}
            </Link>
            <Link
              href={`/${alt}`}
              lang={alt}
              hrefLang={alt}
              className="flex min-h-11 items-center rounded-card border border-line-strong px-3 hover:border-accent hover:text-accent-ink"
            >
              {LANG_LABEL[alt]}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-line bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-ink-muted">
          <h2 className="font-medium text-ink">{dict.sourceHeading}</h2>
          <p className="mt-2 max-w-[65ch]">{dict.sourceNote}</p>
          <p className="mt-2">{dict.currencyNote}</p>
          <a
            href={registry.primarySource().url}
            className="mt-3 inline-block text-accent-ink underline underline-offset-4"
            rel="noreferrer"
          >
            {dict.viewSource}
          </a>
        </div>
      </footer>

      <BackToTop label={dict.backToTop} />
    </div>
  );
}
