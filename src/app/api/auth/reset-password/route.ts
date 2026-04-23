import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL = /[^a-zA-Z0-9]/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { token, password } = body as Record<string, unknown>;

  if (typeof token !== "string" || token.trim() === "") {
    return NextResponse.json({ error: "El campo token es obligatorio" }, { status: 400 });
  }

  if (typeof password !== "string" || password.trim() === "") {
    return NextResponse.json({ error: "El campo contraseña es obligatorio" }, { status: 400 });
  }

  if (!HAS_UPPERCASE.test(password)) {
    return NextResponse.json(
      { error: "La contraseña debe contener al menos una mayúscula" },
      { status: 400 }
    );
  }

  if (!HAS_SPECIAL.test(password)) {
    return NextResponse.json(
      { error: "La contraseña debe contener al menos un carácter especial" },
      { status: 400 }
    );
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: token.trim() },
    select: { id: true, serviceProviderId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "El link de recuperación es inválido o ya fue usado" }, { status: 400 });
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "El link de recuperación expiró. Solicitá uno nuevo." }, { status: 400 });
  }

  if (resetToken.usedAt !== null) {
    return NextResponse.json({ error: "El link de recuperación ya fue usado" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.serviceProvider.update({
      where: { id: resetToken.serviceProviderId },
      data: { hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Contraseña restablecida correctamente" }, { status: 200 });
}
