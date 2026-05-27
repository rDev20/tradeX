import { NextRequest, NextResponse } from "next/server";
import { verifyTokenString } from "./lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("tradex_session")?.value;
  const session = token ? await verifyTokenString(token) : null;
  const authed = session !== null;

  if (PUBLIC_PATHS.has(pathname)) {
    if (authed) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Onboarding gate is enforced server-side in the (app) layout (it does a DB lookup
  // for onboardingStep). Middleware can't easily do that without a DB call per request.
  // Instead, we let routes through and the (app) layout redirects mid-onboarding users
  // to the correct /onboarding/* path. /onboarding/* routes themselves are wrapped in
  // their own layout that checks the same.

  // Server components don't see the request pathname directly — expose it via a request header
  // that next/headers `headers()` can read in server components / layouts.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
