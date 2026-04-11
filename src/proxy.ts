import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
  publicPrefixes,
} from "./routes";

export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isApiAuth = pathname.startsWith(apiAuthPrefix);
  const isApiUploadThing = pathname.startsWith("/api/uploadthing");
  const isApiRoute = pathname.startsWith("/api/");
  const isInvitePage = pathname.startsWith("/invite/");

  // API routes and special pages handle their own auth
  if (isApiAuth || isApiUploadThing || isApiRoute || isInvitePage) {
    return NextResponse.next();
  }

  const isAuthRoute = authRoutes.some((p) => pathname.startsWith(p));

  if (isAuthRoute) {
    if (session) return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url));
    return NextResponse.next();
  }

  const isPublic =
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p));

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
