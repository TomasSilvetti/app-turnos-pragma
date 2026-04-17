import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido" },
      { status: 400 }
    );
  }

  const { name, email, password } = body as Record<string, unknown>;

  if (
    typeof name !== "string" || name.trim() === "" ||
    typeof email !== "string" || email.trim() === "" ||
    typeof password !== "string" || password.trim() === ""
  ) {
    return NextResponse.json(
      { error: "Los campos nombre, email y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "El formato del email no es válido" },
      { status: 400 }
    );
  }

  const existing = await prisma.serviceProvider.findUnique({
    where: { email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.serviceProvider.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
