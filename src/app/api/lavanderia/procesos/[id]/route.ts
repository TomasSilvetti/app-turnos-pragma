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
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const proceso = await prisma.lavProceso.update({
    where: { id },
    data: { nombre },
    select: { id: true, nombre: true },
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
