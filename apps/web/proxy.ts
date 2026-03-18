import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["tr", "en"],
  // Used when no locale matches
  defaultLocale: "tr",
});

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files (_next, images, favicon)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
