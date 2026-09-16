import Link from "next/link";
import { BackToTop } from "./BackToTop";
import { NavMenu } from "./NavMenu";
import type { ReactNode } from "react";
import { registry } from "@/lib/registry";
import { dict } from "@/lib/i18n";

/** Header, footer and page frame. Every route renders inside this. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Sticky so the nav stays reachable while scrolling a long member
          list on a phone. */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:h-16">
          <Link
            href="/"
            // Centres its own text: the touch-target rule in globals.css gives every
            // link a 44px min-height on coarse pointers, and a non-flex link
            // renders its text at the top of that box, sitting high in the bar.
            className="flex shrink-0 items-center text-base font-semibold tracking-tight whitespace-nowrap sm:text-lg"
          >
            {dict.siteName}
          </Link>
          <NavMenu
            links={[
              { href: "/members", label: dict.navMembers },
              { href: "/parties", label: dict.navParties },
            ]}
            menuLabel={dict.navMenu}
          />
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
