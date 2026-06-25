import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAdminSession } from "@/lib/lavanderia/admin-auth";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios" }, { status: 400 });
  }

  const empleado = await prisma.lavEmpleado.findFirst({
    where: { email, esAdmin: true, activo: true },
    select: { id: true, nombre: true, email: true, hashedPassword: true },
  });

  if (!empleado || !empleado.hashedPassword || !empleado.email) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, empleado.hashedPassword);
  if (!ok) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  await setAdminSession({ empleadoId: empleado.id, nombre: empleado.nombre, email: empleado.email });

  return NextResponse.json({ id: empleado.id, nombre: empleado.nombre, email: empleado.email });
}
