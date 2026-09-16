"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The header nav. Inline from `sm` up; a burger below it, because the links
 * pushed "MP Watch" onto a second line on a phone.
 */
export function NavMenu({
  links,
  menuLabel,
}: {
  links: { href: string; label: string }[];
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav className="hidden items-center gap-1 text-sm sm:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex min-h-11 items-center rounded-card px-3 hover:text-accent-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={menuLabel}
        onClick={() => setOpen((was) => !was)}
        className="-me-2 flex h-11 w-11 items-center justify-center rounded-card border border-line-strong sm:hidden"
      >
        {/* Two bars that become a cross. Drawn rather than an icon font so it
            needs no network request and inherits the text colour. */}
        <span aria-hidden className="relative block h-3.5 w-5">
          <span
            className={`absolute inset-x-0 top-0 block h-0.5 bg-current transition-transform ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute inset-x-0 bottom-0 block h-0.5 bg-current transition-transform ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open ? (
        <nav
          id="site-menu"
          className="absolute inset-x-0 top-full border-b border-line bg-surface px-4 pb-3 text-base sm:hidden"
        >
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href} className="border-b border-line/60">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center hover:text-accent-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
