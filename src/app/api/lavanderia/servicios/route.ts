import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireEmpleado } from "@/lib/lavanderia/empleado";

// GET: lista de servicios (para los selectores de la carga/edición de OT).
export async function GET(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const servicios = await prisma.lavServicio.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } });
  return NextResponse.json({ servicios });
}

// POST: crea un servicio (columna de la matriz Precios) con su conjunto de
// procesos. Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const procesoIds: string[] = Array.isArray(body.procesoIds)
    ? body.procesoIds.filter((x: unknown): x is string => typeof x === "string")
    : [];

  const max = await prisma.lavServicio.aggregate({ _max: { orden: true } });
  const servicio = await prisma.lavServicio.create({
    data: {
      nombre,
      orden: (max._max.orden ?? -1) + 1,
      procesos: { create: procesoIds.map((procesoId) => ({ procesoId })) },
    },
    select: { id: true, nombre: true },
  });
  return NextResponse.json({ servicio: { ...servicio, procesoIds } }, { status: 201 });
}
