import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { validatePassword } from "@/lib/password-validation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PATCH: activar/desactivar empleado, cambiar rol admin o actualizar credenciales.
// Solo admin. Al promover a admin se exigen email + contraseña.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const actual = await prisma.lavEmpleado.findUnique({
    where: { id },
    select: { id: true, esAdmin: true, email: true, hashedPassword: true },
  });
  if (!actual) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const data: {
    activo?: boolean;
    esAdmin?: boolean;
    nombre?: string;
    email?: string;
    hashedPassword?: string;
  } = {};

  if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
  if (typeof body.activo === "boolean") data.activo = body.activo;

  const seraAdmin = typeof body.esAdmin === "boolean" ? body.esAdmin : actual.esAdmin;
  if (typeof body.esAdmin === "boolean") data.esAdmin = body.esAdmin;

  // Evitar que el admin se bloquee a sí mismo.
  if (id === admin.id && (data.activo === false || data.esAdmin === false)) {
    return NextResponse.json({ error: "No podés quitarte tu propio acceso de administrador" }, { status: 400 });
  }

  // Email (solo relevante para admins).
  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "El formato del email no es válido" }, { status: 400 });
    }
    const otro = await prisma.lavEmpleado.findUnique({ where: { email }, select: { id: true } });
    if (otro && otro.id !== id) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    data.email = email;
  }

  // Contraseña nueva (opcional).
  if (typeof body.password === "string" && body.password !== "") {
    if (!validatePassword(body.password).isValid) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos una mayúscula y un carácter especial" },
        { status: 400 }
      );
    }
    data.hashedPassword = await bcrypt.hash(body.password, 12);
  }

  // Al promover a admin debe quedar con email + contraseña.
  if (seraAdmin) {
    const tendraEmail = data.email ?? actual.email;
    const tendraPass = data.hashedPassword ?? actual.hashedPassword;
    if (!tendraEmail || !tendraPass) {
      return NextResponse.json(
        { error: "Para hacer admin a un empleado necesitás definir su email y contraseña" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const empleado = await prisma.lavEmpleado.update({
    where: { id },
    data,
    select: { id: true, nombre: true, esAdmin: true, activo: true, email: true },
  });
  return NextResponse.json({ empleado });
}
