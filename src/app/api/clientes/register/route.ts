import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { setClientSession } from "@/lib/cliente-auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  let body: {
    nombre?: string;
    apellido?: string;
    email?: string;
    sexo?: string;
    edad?: number;
    password?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { nombre, apellido, email, sexo, edad, password } = body;

  if (
    !nombre?.trim() ||
    !apellido?.trim() ||
    !email?.trim() ||
    !sexo ||
    edad == null ||
    !password
  ) {
    return NextResponse.json(
      { error: "Todos los campos son obligatorios" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "El formato del email no es válido" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const edadNum = Number(edad);
  if (isNaN(edadNum) || edadNum < 1 || edadNum > 120) {
    return NextResponse.json(
      { error: "La edad debe estar entre 1 y 120" },
      { status: 400 }
    );
  }

  const existing = await prisma.cliente.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con este email" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const cliente = await prisma.cliente.create({
    data: {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim().toLowerCase(),
      sexo,
      edad: edadNum,
      hashedPassword,
    },
    select: { id: true, nombre: true, apellido: true, email: true },
  });

  const response = NextResponse.json(cliente, { status: 201 });
  await setClientSession(response, {
    clienteId: cliente.id,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    email: cliente.email,
  });

  return response;
}
