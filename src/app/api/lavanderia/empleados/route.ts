import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { validatePassword } from "@/lib/password-validation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET: lista de empleados activos NO admin (publico, alimenta el selector del
// navbar). El admin ya no es seleccionable; entra por /lavanderia/admin/login.
// Con ?todos=1 y sesion admin, incluye inactivos, admins y el email (gestion).
export async function GET(request: NextRequest) {
  const todos = request.nextUrl.searchParams.get("todos") === "1";
  if (todos) {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const empleados = await prisma.lavEmpleado.findMany({
      orderBy: [{ activo: "desc" }, { esAdmin: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, esAdmin: true, activo: true, email: true },
    });
    return NextResponse.json({ empleados });
  }

  const empleados = await prisma.lavEmpleado.findMany({
    where: { activo: true, esAdmin: false },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, esAdmin: true },
  });
  return NextResponse.json({ empleados });
}

// POST: crea un empleado. Solo admin. Si es admin, exige email + contraseña.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const esAdmin = Boolean(body.esAdmin);
  let email: string | null = null;
  let hashedPassword: string | null = null;

  if (esAdmin) {
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email válido requerido para administradores" }, { status: 400 });
    }
    if (!validatePassword(password).isValid) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos una mayúscula y un carácter especial" },
        { status: 400 }
      );
    }
    const existente = await prisma.lavEmpleado.findUnique({ where: { email }, select: { id: true } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    hashedPassword = await bcrypt.hash(password, 12);
  }

  const empleado = await prisma.lavEmpleado.create({
    data: { nombre, esAdmin, email, hashedPassword },
    select: { id: true, nombre: true, esAdmin: true, activo: true, email: true },
  });
  return NextResponse.json({ empleado }, { status: 201 });
}
