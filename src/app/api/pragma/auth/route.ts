import { NextRequest, NextResponse } from "next/server";
import {
  isPasswordSet,
  setPassword,
  verifyPassword,
  generateSessionToken,
  verifySessionToken,
  PRAGMA_COOKIE,
} from "@/lib/pragma-auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(PRAGMA_COOKIE)?.value;
  const authenticated = token ? verifySessionToken(token) : false;
  const passwordSet = isPasswordSet();
  return NextResponse.json({ authenticated, passwordSet });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { password } = body as Record<string, unknown>;
  if (typeof password !== "string" || password.trim() === "") {
    return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
  }

  const passwordSet = isPasswordSet();

  if (!passwordSet) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    await setPassword(password);
  } else {
    const valid = await verifyPassword(password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }
  }

  const token = generateSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(PRAGMA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(PRAGMA_COOKIE);
  return response;
}
