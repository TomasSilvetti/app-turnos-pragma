import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularDuracion } from "./duraciones";
import { recompactar } from "./capacidad";

export type ResultadoRecombinar = {
  gruposRecombinados: number; // grupos que se volvieron a unir en una sola OT
  otsEliminadas: number; // sub-OTs pendientes que se colapsaron
};

// Backfill: como ya no se parten las OTs, colapsa en una sola OT PENDIENTE las
// partes pendientes de cada grupo que quedaron de la etapa en que sí se partía.
//
//  - Une lo que quede pendiente aunque haya hermanos ya terminados / en progreso
//    (esos no se tocan; solo se juntan las partes que todavía no se empezaron).
//  - La duración se RECALCULA con la matriz (`calcularDuracion`): así el valet x
//    kilo cuenta como una sola carga (su tiempo NO escala con la cantidad de kilos),
//    y no se infla al sumar las partes.
// Se corre una vez tras el deploy (o desde el botón "Reagrupar partidas").
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
    // Une los items de todas las partes por (prenda + procesos + descripción)
    // sumando la cantidad; la duración se recalcula (valet = carga entera).
    const acc = new Map<string, { prendaId: string | null; descripcion: string; cantidad: number; procesoIds: string[] }>();
    for (const p of ps) {
      for (const it of p.items) {
        const key = `${it.prendaId ?? ""}|${[...it.procesoIds].sort().join(",")}|${it.descripcion}`;
        const e = acc.get(key);
        if (e) e.cantidad += it.cantidad;
        else acc.set(key, { prendaId: it.prendaId, descripcion: it.descripcion, cantidad: it.cantidad, procesoIds: it.procesoIds });
      }
    }
    const calc = await calcularDuracion([...acc.values()]);
    const itemsCreate = calc.items.map((it) => ({
      descripcion: it.descripcion,
      prendaId: it.prendaId,
      cantidad: it.cantidad,
      procesoIds: it.procesoIds,
      duracionMin: it.duracionMin,
    }));

    const base = ps[0]; // menor parteIndice (orden de creación como desempate)

    if (ps.length === 1) {
      // Una sola parte pendiente: se desagrupa (queda entera) y se recalcula.
      await prisma.lavOT.update({
        where: { id: base.id },
        data: {
          grupoId: null,
          parteIndice: null,
          parteTotal: null,
          estado: "pendiente",
          duracionMin: calc.duracionTotal,
          aRevisar: calc.aRevisar,
          items: { deleteMany: {}, create: itemsCreate },
        },
      });
    } else {
      // Varias partes pendientes: se colapsan en una sola OT pendiente.
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
            duracionMin: calc.duracionTotal,
            aRevisar: calc.aRevisar,
            urgente: base.urgente,
            fechaNecesaria: base.fechaNecesaria,
            empleadoCargaId: base.empleadoCargaId,
            datosIA: base.datosIA === null ? undefined : (base.datosIA as Prisma.InputJsonValue),
            createdAt,
            items: { create: itemsCreate },
          },
        });
      });
    }
    gruposRecombinados++;
    otsEliminadas += ps.length;
  }

  // Reacomoda la cola tras colapsar grupos.
  if (gruposRecombinados > 0) await recompactar();

  return { gruposRecombinados, otsEliminadas };
}
