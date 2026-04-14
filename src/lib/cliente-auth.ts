import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "cliente-session";

export type ClientPayload = {
  clienteId: string;
  nombre: string;
  apellido: string;
  email: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.CLIENT_JWT_SECRET;
  if (!secret) throw new Error("CLIENT_JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

export async function signClientToken(
  payload: ClientPayload,
  maxAge: number = 60 * 60 * 24 * 7
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyClientToken(token: string): Promise<ClientPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ClientPayload;
  } catch {
    return null;
  }
}

export async function setClientSession(
  payload: ClientPayload,
  maxAge: number = 60 * 60 * 24 * 7
): Promise<void> {
  const token = await signClientToken(payload, maxAge);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function getClientSession(
  request: NextRequest
): Promise<ClientPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyClientToken(token);
}

export async function clearClientSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
