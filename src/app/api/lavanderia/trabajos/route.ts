import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// GET: config completa de trabajos. Solo admin.
//  - prendas (filas de ambas matrices)
//  - procesos (columnas de la matriz Tiempos)
//  - servicios (columnas de la matriz Precios) con sus procesoIds
//  - tiempos: minutos por prenda x proceso
//  - precios: precio por prenda x servicio
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [prendas, procesos, servicios, servicioProcesos, tiempos, precios] = await Promise.all([
    prisma.lavPrenda.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavProceso.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavServicio.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavServicioProceso.findMany({ select: { servicioId: true, procesoId: true } }),
    prisma.lavDuracion.findMany({ select: { prendaId: true, procesoId: true, minutos: true } }),
    prisma.lavPrecio.findMany({ select: { prendaId: true, servicioId: true, precio: true } }),
  ]);

  const procesoIdsPorServicio = new Map<string, string[]>();
  for (const sp of servicioProcesos) {
    const arr = procesoIdsPorServicio.get(sp.servicioId) ?? [];
    arr.push(sp.procesoId);
    procesoIdsPorServicio.set(sp.servicioId, arr);
  }

  return NextResponse.json({
    prendas,
    procesos,
    servicios: servicios.map((s) => ({ ...s, procesoIds: procesoIdsPorServicio.get(s.id) ?? [] })),
    tiempos,
    precios,
  });
}
