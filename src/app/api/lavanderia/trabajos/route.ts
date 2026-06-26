import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// GET: matriz completa (prendas x procesos con sus duraciones). Solo admin.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [prendas, procesos, duraciones] = await Promise.all([
    prisma.lavPrenda.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavProceso.findMany({
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true, esExtra: true },
    }),
    prisma.lavDuracion.findMany({ select: { prendaId: true, procesoId: true, minutos: true, precio: true } }),
  ]);

  return NextResponse.json({ prendas, procesos, duraciones });
}
