import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recalcularOTsActivas } from "@/lib/lavanderia/duraciones";

// PATCH: renombrar proceso. DELETE: eliminar columna (cascade en duraciones).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const data: { nombre?: string; esExtra?: boolean } = {};

  if (body.nombre !== undefined) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    data.nombre = nombre;
  }
  if (body.esExtra !== undefined) data.esExtra = body.esExtra === true;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const proceso = await prisma.lavProceso.update({
    where: { id },
    data,
    select: { id: true, nombre: true, esExtra: true },
  });
  return NextResponse.json({ proceso });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  await prisma.lavProceso.delete({ where: { id } });

  // El proceso (y sus minutos) desaparece de todas las prendas: recalcular las
  // OTs activas para que el tablero refleje los nuevos tiempos.
  await recalcularOTsActivas();

  return NextResponse.json({ ok: true });
}
