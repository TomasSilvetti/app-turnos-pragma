import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireEmpleado } from "@/lib/lavanderia/empleado";

// GET: procesos (columnas de la matriz) + tiempos por prenda × proceso. Lo usa la
// carga/edición de OT para mostrar los chips y calcular la duración en vivo.
export async function GET(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [procesos, tiempos] = await Promise.all([
    prisma.lavProceso.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavDuracion.findMany({ select: { prendaId: true, procesoId: true, minutos: true } }),
  ]);
  return NextResponse.json({ procesos, tiempos });
}

// POST: crea un proceso granular (columna de la matriz Tiempos). Solo admin.
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
