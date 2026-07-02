import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularDuracion } from "@/lib/lavanderia/duraciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ ENDPOINT DE REPARACIÓN (one-off) — normaliza los items "Valet x kilo":
//  1) les asegura el proceso Limpieza (los tickets nunca lo traen escrito), y
//  2) recalcula la duración de sus OTs con la regla actual: valet no escala con
//     los kilos, la duración es la de la matriz por carga (no × cantidad).
// Recalcula TODAS las OTs con valet (no solo las que faltaban Limpieza), porque
// las viejas quedaron con la duración multiplicada por kilos. Idempotente.
const SECRET = "6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e";

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [prendas, procesos] = await Promise.all([
    prisma.lavPrenda.findMany({ select: { id: true, nombre: true } }),
    prisma.lavProceso.findMany({ select: { id: true, nombre: true } }),
  ]);

  const valetIds = new Set(prendas.filter((p) => normalizar(p.nombre).includes("valet")).map((p) => p.id));
  const limpieza = procesos.find((p) => normalizar(p.nombre) === "limpieza");

  if (valetIds.size === 0) return NextResponse.json({ ok: false, error: "No hay prenda 'Valet x kilo'" }, { status: 400 });
  if (!limpieza) return NextResponse.json({ ok: false, error: "No existe el proceso 'Limpieza'" }, { status: 400 });

  // Todos los items de valet (con su OT). Los que no tienen Limpieza se reparan;
  // igual se recalculan TODAS las OTs con valet para aplicar la nueva regla de
  // duración (no × kilos) a las que ya la tenían.
  const items = await prisma.lavOTItem.findMany({
    where: { prendaId: { in: [...valetIds] } },
    select: { id: true, otId: true, procesoIds: true },
  });

  if (items.length === 0) {
    return NextResponse.json({ ok: true, itemsReparados: 0, otsRecalculadas: 0, mensaje: "No hay OTs con valet" });
  }

  const sinLimpieza = items.filter((it) => !it.procesoIds.includes(limpieza.id));

  // 1) Agregar Limpieza a los items de valet que no la tenían.
  if (sinLimpieza.length > 0) {
    await prisma.$transaction(
      sinLimpieza.map((it) =>
        prisma.lavOTItem.update({
          where: { id: it.id },
          data: { procesoIds: { set: [limpieza.id, ...it.procesoIds] } },
        })
      )
    );
  }

  // 2) Recalcular la duración de las OTs con valet con la matriz/regla actual.
  // Solo las activas: las terminadas se dejan intactas (histórico congelado).
  const otIds = [...new Set(items.map((it) => it.otId))];
  const ots = await prisma.lavOT.findMany({
    where: { id: { in: otIds }, estado: { not: "terminado" } },
    include: { items: { select: { id: true, prendaId: true, descripcion: true, cantidad: true, procesoIds: true } } },
  });

  const updates = [];
  for (const ot of ots) {
    const calculo = await calcularDuracion(
      ot.items.map((it) => ({ prendaId: it.prendaId, descripcion: it.descripcion, cantidad: it.cantidad, procesoIds: it.procesoIds }))
    );
    ot.items.forEach((it, i) => {
      const c = calculo.items[i];
      updates.push(prisma.lavOTItem.update({ where: { id: it.id }, data: { duracionMin: c.duracionMin, procesoIds: c.procesoIds } }));
    });
    updates.push(prisma.lavOT.update({ where: { id: ot.id }, data: { duracionMin: calculo.duracionTotal, aRevisar: calculo.aRevisar } }));
  }
  await prisma.$transaction(updates);

  return NextResponse.json({ ok: true, itemsReparados: sinLimpieza.length, otsRecalculadas: ots.length, otIds });
}
