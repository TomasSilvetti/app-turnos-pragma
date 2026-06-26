import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recalcularOTsActivas } from "@/lib/lavanderia/duraciones";

// PATCH: edita nombre y/o el conjunto de procesos de un servicio. DELETE: elimina
// el servicio (cascade en precios y en servicio_procesos). Solo admin.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : undefined;
  if (body.nombre !== undefined && !nombre)
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const procesoIds: string[] | undefined = Array.isArray(body.procesoIds)
    ? body.procesoIds.filter((x: unknown): x is string => typeof x === "string")
    : undefined;

  await prisma.$transaction(async (tx) => {
    if (nombre !== undefined) await tx.lavServicio.update({ where: { id }, data: { nombre } });
    if (procesoIds !== undefined) {
      await tx.lavServicioProceso.deleteMany({ where: { servicioId: id } });
      if (procesoIds.length > 0)
        await tx.lavServicioProceso.createMany({ data: procesoIds.map((procesoId) => ({ servicioId: id, procesoId })) });
    }
  });

  // Cambiar los procesos de un servicio cambia la duración de las OTs que lo usan.
  if (procesoIds !== undefined) await recalcularOTsActivas();

  const servicio = await prisma.lavServicio.findUnique({
    where: { id },
    select: { id: true, nombre: true, procesos: { select: { procesoId: true } } },
  });
  return NextResponse.json({
    servicio: servicio && { id: servicio.id, nombre: servicio.nombre, procesoIds: servicio.procesos.map((p) => p.procesoId) },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  await prisma.lavServicio.delete({ where: { id } });
  await recalcularOTsActivas();
  return NextResponse.json({ ok: true });
}
