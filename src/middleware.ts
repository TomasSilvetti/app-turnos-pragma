import NextAuth from "next-auth";
import { authConfig } from "../auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const DASHBOARD_PREFIX = "/dashboard";
const ONBOARDING_PERFIL = "/onboarding/perfil";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const hasProfile = !!(req.auth?.user as { hasProfile?: boolean } | undefined)?.hasProfile;

  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isOnboardingPerfil = pathname === ONBOARDING_PERFIL;
  const isLoginPage = pathname === "/login";

  // Redirect unauthenticated users to login
  if ((isDashboard || isOnboardingPerfil) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Redirect authenticated users away from login
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL(DASHBOARD_PREFIX, req.nextUrl));
  }

  if (!isDashboard && !isOnboardingPerfil) {
    return NextResponse.next();
  }

  // Accessing dashboard without profile → onboarding
  if (isDashboard && !hasProfile) {
    return NextResponse.redirect(new URL(ONBOARDING_PERFIL, req.nextUrl));
  }

  // Accessing onboarding with profile already configured → dashboard
  if (isOnboardingPerfil && hasProfile) {
    return NextResponse.redirect(new URL(DASHBOARD_PREFIX, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
