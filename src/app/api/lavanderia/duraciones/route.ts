import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recalcularOTsActivas } from "@/lib/lavanderia/duraciones";

// PUT: edita el tiempo (minutos) de una celda prenda x proceso de la matriz
// Tiempos. minutos <= 0 elimina la celda (ese proceso no aplica a esa prenda).
// Solo admin.
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const prendaId = typeof body.prendaId === "string" ? body.prendaId : "";
  const procesoId = typeof body.procesoId === "string" ? body.procesoId : "";
  if (!prendaId || !procesoId)
    return NextResponse.json({ error: "prendaId y procesoId requeridos" }, { status: 400 });

  const minutos = Number.isFinite(body.minutos) ? Math.max(0, Math.round(body.minutos)) : 0;
  if (minutos <= 0) {
    await prisma.lavDuracion.deleteMany({ where: { prendaId, procesoId } });
  } else {
    await prisma.lavDuracion.upsert({
      where: { prendaId_procesoId: { prendaId, procesoId } },
      update: { minutos },
      create: { prendaId, procesoId, minutos },
    });
    // Cargarle minutos a una prenda nueva la deja de marcar como incompleta.
    await prisma.lavPrenda.updateMany({ where: { id: prendaId, incompleta: true }, data: { incompleta: false } });
  }

  // Reflejar el cambio de tiempo en las OTs activas que usan esta prenda.
  await recalcularOTsActivas([prendaId]);

  return NextResponse.json({ prendaId, procesoId, minutos });
}
