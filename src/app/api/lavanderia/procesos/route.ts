import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// POST: crea un proceso (columna de la matriz). Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const max = await prisma.lavProceso.aggregate({ _max: { orden: true } });
  const proceso = await prisma.lavProceso.create({
    data: { nombre, orden: (max._max.orden ?? -1) + 1 },
    select: { id: true, nombre: true },
  });
  return NextResponse.json({ proceso }, { status: 201 });
}
