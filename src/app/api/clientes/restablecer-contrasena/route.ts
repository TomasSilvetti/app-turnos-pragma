import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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
    return NextResponse.json({ error: "El campo password es obligatorio" }, { status: 400 });
  }

  const { isValid } = validatePassword(password);
  if (!isValid) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos una mayúscula y un carácter especial" },
      { status: 422 }
    );
  }

  const resetToken = await prisma.clientePasswordResetToken.findUnique({
    where: { token: token.trim() },
    select: { id: true, clienteId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "El link no es válido o ya fue utilizado" }, { status: 400 });
  }

  if (resetToken.usedAt !== null) {
    return NextResponse.json({ error: "El link no es válido o ya fue utilizado" }, { status: 400 });
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "El link expiró" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: resetToken.clienteId },
      data: { hashedPassword },
    }),
    prisma.clientePasswordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    }),
  ]);

  return NextResponse.json({ message: "Contraseña restablecida con éxito" }, { status: 200 });
}
