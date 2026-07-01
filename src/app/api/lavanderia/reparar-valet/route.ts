import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularDuracion } from "@/lib/lavanderia/duraciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ ENDPOINT DE REPARACIÓN (one-off) — a los items "Valet x kilo" que quedaron
// cargados sin proceso les asigna Limpieza y recalcula la duración de su OT.
// Los tickets de valet nunca traen el proceso escrito, así que las OTs viejas
// quedaron en 0 min. Idempotente: si el item ya tiene Limpieza, no lo toca.
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

  // Items de valet que aún no tienen el proceso Limpieza.
  const items = await prisma.lavOTItem.findMany({
    where: { prendaId: { in: [...valetIds] } },
    select: { id: true, otId: true, procesoIds: true },
  });
  const aReparar = items.filter((it) => !it.procesoIds.includes(limpieza.id));

  if (aReparar.length === 0) {
    return NextResponse.json({ ok: true, itemsReparados: 0, otsRecalculadas: 0, mensaje: "Nada para reparar" });
  }

  // 1) Agregar Limpieza a esos items.
  await prisma.$transaction(
    aReparar.map((it) =>
      prisma.lavOTItem.update({
        where: { id: it.id },
        data: { procesoIds: { set: [limpieza.id, ...it.procesoIds] } },
      })
    )
  );

  // 2) Recalcular la duración de cada OT afectada con la matriz actual.
  const otIds = [...new Set(aReparar.map((it) => it.otId))];
  const ots = await prisma.lavOT.findMany({
    where: { id: { in: otIds } },
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

  return NextResponse.json({ ok: true, itemsReparados: aReparar.length, otsRecalculadas: ots.length, otIds });
}
