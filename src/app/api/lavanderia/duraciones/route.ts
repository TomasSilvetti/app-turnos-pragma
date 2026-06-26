import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recalcularOTsActivas } from "@/lib/lavanderia/duraciones";

// PUT: edita una celda (prenda x proceso). El body trae minutos o precio:
// - minutos: <= 0 elimina la celda (ese proceso no aplica a esa prenda);
//   > 0 la crea/actualiza (precio 0 por defecto).
// - precio: actualiza el precio de la celda. Solo aplica si la celda existe
//   (el proceso aplica a esa prenda); si no existe, no la crea.
// Solo admin.
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const prendaId = typeof body.prendaId === "string" ? body.prendaId : "";
  const procesoId = typeof body.procesoId === "string" ? body.procesoId : "";
  if (!prendaId || !procesoId)
    return NextResponse.json({ error: "prendaId y procesoId requeridos" }, { status: 400 });

  const editaMinutos = body.minutos !== undefined;
  const editaPrecio = body.precio !== undefined;
  if (!editaMinutos && !editaPrecio)
    return NextResponse.json({ error: "Falta minutos o precio" }, { status: 400 });

  if (editaMinutos) {
    const minutos = Number.isFinite(body.minutos) ? Math.max(0, Math.round(body.minutos)) : 0;
    if (minutos <= 0) {
      await prisma.lavDuracion.deleteMany({ where: { prendaId, procesoId } });
    } else {
      await prisma.lavDuracion.upsert({
        where: { prendaId_procesoId: { prendaId, procesoId } },
        update: { minutos },
        create: { prendaId, procesoId, minutos },
      });
    }
  }

  if (editaPrecio) {
    const precio = Number.isFinite(body.precio) ? Math.max(0, Math.round(body.precio)) : 0;
    // updateMany para no crear la celda si el proceso no aplica a esta prenda.
    await prisma.lavDuracion.updateMany({ where: { prendaId, procesoId }, data: { precio } });
  }

  // Reflejar el cambio (tiempo o precio) en las OTs activas que usan esta prenda:
  // el tablero (SSE) toma el cambio solo, sin recargar.
  await recalcularOTsActivas([prendaId]);

  return NextResponse.json({ prendaId, procesoId });
}
