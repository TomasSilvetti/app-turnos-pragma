import NextAuth from "next-auth";
import { authConfig } from "../auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const DASHBOARD_PREFIX = "/dashboard";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isLoginPage = pathname === "/login";

  // Redirect unauthenticated users to login, preserving the original URL as callbackUrl
  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL(DASHBOARD_PREFIX, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
