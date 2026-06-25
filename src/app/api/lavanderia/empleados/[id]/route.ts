import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// PATCH: activar/desactivar empleado o cambiar rol admin. Solo admin.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const data: { activo?: boolean; esAdmin?: boolean; nombre?: string } = {};
  if (typeof body.activo === "boolean") data.activo = body.activo;
  if (typeof body.esAdmin === "boolean") data.esAdmin = body.esAdmin;
  if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const empleado = await prisma.lavEmpleado.update({
    where: { id },
    data,
    select: { id: true, nombre: true, esAdmin: true, activo: true },
  });
  return NextResponse.json({ empleado });
}
