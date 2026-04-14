import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { setClientSession } from "@/lib/cliente-auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; rememberMe?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { email, password, rememberMe } = body;

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  const cliente = await prisma.cliente.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      hashedPassword: true,
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, cliente.hashedPassword);
  if (!isValid) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  await setClientSession(
    {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
    },
    rememberMe ? 60 * 60 * 24 * 30 : undefined
  );

  return NextResponse.json(
    {
      id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
    },
    { status: 200 }
  );
}
