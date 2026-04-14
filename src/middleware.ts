import NextAuth from "next-auth";
import { authConfig } from "../auth.config";
import { NextResponse, NextRequest } from "next/server";
import { jwtVerify } from "jose";

const { auth } = NextAuth(authConfig);

const DASHBOARD_PREFIX = "/dashboard";

function getClientSecret(): Uint8Array {
  const secret = process.env.CLIENT_JWT_SECRET;
  if (!secret) throw new Error("CLIENT_JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

async function isClientAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("cliente-session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getClientSecret());
    return true;
  } catch {
    return false;
  }
}

export default auth(async (req) => {
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

  // Proteger /turnos/[slug] (exacto): redirigir a login si el cliente no está autenticado
  const turnosExactMatch = pathname.match(/^\/turnos\/([^/]+)$/);
  if (turnosExactMatch) {
    const authenticated = await isClientAuthenticated(req);
    if (!authenticated) {
      const slug = turnosExactMatch[1];
      return NextResponse.redirect(new URL(`/turnos/${slug}/login`, req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
