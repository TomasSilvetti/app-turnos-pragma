import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recompactar } from "./capacidad";

export type ResultadoRecombinar = {
  gruposRecombinados: number; // grupos que se volvieron a unir en una sola OT
  otsEliminadas: number; // sub-OTs pendientes que se colapsaron
};

// Backfill: como ya no se parten las OTs, colapsa en una sola OT las partes
// PENDIENTES de cada grupo que quedaron de la etapa en que sí se partía.
//
//  - Une lo que quede pendiente aunque haya hermanos ya terminados / en progreso
//    (esos no se tocan; solo se juntan las partes que todavía no se empezaron).
//  - La duración se SUMA de las partes (no se recalcula con la matriz: para un
//    valet parcial la matriz daría la carga completa, inflando la OT).
//  - Un grupo con una sola parte pendiente igual se "desagrupa" (pierde la etiqueta
//    X/Y y queda como OT normal).
// Se corre una vez tras el deploy.
export async function recombinarTodas(): Promise<ResultadoRecombinar> {
  const partes = await prisma.lavOT.findMany({
    where: { estado: "pendiente", grupoId: { not: null } },
    include: { items: true },
    orderBy: [{ parteIndice: "asc" }, { createdAt: "asc" }],
  });

  const porGrupo = new Map<string, typeof partes>();
  for (const p of partes) {
    const arr = porGrupo.get(p.grupoId!) ?? [];
    arr.push(p);
    porGrupo.set(p.grupoId!, arr);
  }

  let gruposRecombinados = 0;
  let otsEliminadas = 0;

  for (const ps of porGrupo.values()) {
    // Una sola parte pendiente: solo se le quita la marca de grupo (queda entera).
    if (ps.length === 1) {
      await prisma.lavOT.update({
        where: { id: ps[0].id },
        data: { grupoId: null, parteIndice: null, parteTotal: null },
      });
      gruposRecombinados++;
      otsEliminadas += 1;
      continue;
    }

    // Varias partes pendientes: se colapsan en una sola OT. Los items se unen por
    // (prenda + procesos + descripción) sumando cantidad y duración; la duración
    // total es la suma de las partes (el trabajo que realmente queda por hacer).
    const acc = new Map<string, { prendaId: string | null; descripcion: string; cantidad: number; procesoIds: string[]; duracionMin: number }>();
    for (const p of ps) {
      for (const it of p.items) {
        const key = `${it.prendaId ?? ""}|${[...it.procesoIds].sort().join(",")}|${it.descripcion}`;
        const e = acc.get(key);
        if (e) {
          e.cantidad += it.cantidad;
          e.duracionMin += it.duracionMin;
        } else {
          acc.set(key, { prendaId: it.prendaId, descripcion: it.descripcion, cantidad: it.cantidad, procesoIds: it.procesoIds, duracionMin: it.duracionMin });
        }
      }
    }
    const items = [...acc.values()];
    const duracionTotal = items.reduce((a, it) => a + it.duracionMin, 0);

    const base = ps[0]; // menor parteIndice (orden de creación como desempate)
    const createdAt = ps.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), ps[0].createdAt);

    await prisma.$transaction(async (tx) => {
      await tx.lavOT.deleteMany({ where: { id: { in: ps.map((p) => p.id) } } });
      await tx.lavOT.create({
        data: {
          numero: base.numero,
          nombreCliente: base.nombreCliente,
          telefono: base.telefono,
          domicilio: base.domicilio,
          fechaTicket: base.fechaTicket,
          estado: "pendiente",
          fechaAsignada: base.fechaAsignada,
          orden: base.orden,
          duracionMin: duracionTotal,
          aRevisar: ps.some((p) => p.aRevisar),
          urgente: base.urgente,
          fechaNecesaria: base.fechaNecesaria,
          empleadoCargaId: base.empleadoCargaId,
          datosIA: base.datosIA === null ? undefined : (base.datosIA as Prisma.InputJsonValue),
          createdAt,
          items: {
            create: items.map((it) => ({
              descripcion: it.descripcion,
              prendaId: it.prendaId,
              cantidad: it.cantidad,
              procesoIds: it.procesoIds,
              duracionMin: it.duracionMin,
            })),
          },
        },
      });
    });
    gruposRecombinados++;
    otsEliminadas += ps.length;
  }

  // Reacomoda la cola tras colapsar grupos.
  if (gruposRecombinados > 0) await recompactar();

  return { gruposRecombinados, otsEliminadas };
}
