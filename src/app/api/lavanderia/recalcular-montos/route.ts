import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// POST: recalcula el monto de todos los items de OT aplicando los precios
// actuales de la matriz. Se corre tras cargar/cambiar precios. Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // prendaId -> precio unitario (suma de precios de los procesos que aplican)
  const duraciones = await prisma.lavDuracion.findMany({
    select: { prendaId: true, proceso: { select: { precio: true } } },
  });
  const precioPorPrenda = new Map<string, number>();
  for (const d of duraciones) {
    precioPorPrenda.set(d.prendaId, (precioPorPrenda.get(d.prendaId) ?? 0) + d.proceso.precio);
  }

  const items = await prisma.lavOTItem.findMany({
    select: { id: true, prendaId: true, cantidad: true, monto: true },
  });

  let actualizados = 0;
  await prisma.$transaction(
    items
      .map((it) => {
        const precioUnit = it.prendaId ? precioPorPrenda.get(it.prendaId) ?? 0 : 0;
        const monto = precioUnit * it.cantidad;
        if (monto === it.monto) return null;
        actualizados++;
        return prisma.lavOTItem.update({ where: { id: it.id }, data: { monto } });
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  );

  return NextResponse.json({ ok: true, total: items.length, actualizados });
}
