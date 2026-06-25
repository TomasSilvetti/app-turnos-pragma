import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/password-validation";

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
  if (typeof password !== "string" || password === "") {
    return NextResponse.json({ error: "El campo contraseña es obligatorio" }, { status: 400 });
  }

  const { isValid } = validatePassword(password);
  if (!isValid) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos una mayúscula y un carácter especial" },
      { status: 422 }
    );
  }

  const resetToken = await prisma.lavPasswordResetToken.findUnique({
    where: { token: token.trim() },
    select: { id: true, empleadoId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken || resetToken.usedAt !== null) {
    return NextResponse.json({ error: "El link no es válido o ya fue utilizado" }, { status: 400 });
  }
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "El link expiró" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.lavEmpleado.update({
      where: { id: resetToken.empleadoId },
      data: { hashedPassword },
    }),
    prisma.lavPasswordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Contraseña restablecida con éxito" }, { status: 200 });
}
