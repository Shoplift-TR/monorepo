import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const routing = defineRouting({
  locales: ["en", "tr"],
  defaultLocale: "tr",
});

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always run intl middleware first
  const intlResponse = intlMiddleware(request);

  // Determine if this is a login page
  const isLoginPage =
    pathname === "/login" ||
    pathname === "/en/login" ||
    pathname === "/tr/login";

  // If it's a static file or API route, skip auth check
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return intlResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars missing, never block — always return intl response
  if (!supabaseUrl || !supabaseKey) {
    return intlResponse;
  }

  try {
    const response = intlResponse || NextResponse.next();

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: any;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && !isLoginPage) {
      const locale = pathname.startsWith("/en") ? "en" : "tr";
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    return response;
  } catch (error) {
    // NEVER let middleware errors cause 404s
    // Always fall back to intl response
    console.error("Admin middleware error:", error);
    return intlResponse || NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
