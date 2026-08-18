import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, LANGS } from "@/lib/i18n";

/** Sends bare paths to a locale, preferring the browser's Accept-Language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLang = LANGS.some(
    (lang) => pathname === `/${lang}` || pathname.startsWith(`/${lang}/`),
  );
  if (hasLang) return;

  const accepts = request.headers.get("accept-language") ?? "";
  const lang = accepts.toLowerCase().includes("dv") ? "dv" : DEFAULT_LANG;

  request.nextUrl.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
