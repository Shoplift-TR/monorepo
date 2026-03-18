import createNextIntlMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const routing = defineRouting({
  locales: ["en", "tr"],
  defaultLocale: "tr",
});

const handleIntl = createNextIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Handle internationalization
  const response = handleIntl(request);

  // 2. Handle Supabase Auth (similar to previous middleware)
  const supabaseUrl = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY;

  // Clean pathname for auth checks (remove locale prefix if present)
  const pathname = request.nextUrl.pathname;
  const isLoginPage =
    pathname === "/login" ||
    pathname === "/en/login" ||
    pathname === "/tr/login";

  if (!supabaseUrl || !supabaseKey) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL("/tr/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(
          ({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value),
        );
        // We have to return a NEW response if we set cookies
        // But since we already have 'response' from intl, we might need to sync them
        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string;
            value: string;
            options?: any;
          }) => response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && !isLoginPage) {
    // Redirect to login with current locale if possible, default to /tr/login
    const locale = pathname.startsWith("/en") ? "en" : "tr";
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Security Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
