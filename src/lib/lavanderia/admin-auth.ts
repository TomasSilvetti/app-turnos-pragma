import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

// Sesion propia del admin de lavanderia. La app de empleados sigue sin login
// (header x-empleado-id); el admin, en cambio, entra por email + contraseña y
// su identidad viaja en esta cookie firmada. Espejo de `cliente-auth.ts`.

const COOKIE_NAME = "lav-admin-session";

export type LavAdminPayload = {
  empleadoId: string;
  nombre: string;
  email: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(
  payload: LavAdminPayload,
  maxAge: number = 60 * 60 * 24 * 7
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<LavAdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as LavAdminPayload;
  } catch {
    return null;
  }
}

export async function setAdminSession(
  payload: LavAdminPayload,
  maxAge: number = 60 * 60 * 24 * 7
): Promise<void> {
  const token = await signAdminToken(payload, maxAge);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function getAdminSession(request: NextRequest): Promise<LavAdminPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
