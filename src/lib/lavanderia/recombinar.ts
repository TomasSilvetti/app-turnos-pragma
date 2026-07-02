import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularDuracion } from "./duraciones";
import { recompactar } from "./capacidad";

export type ResultadoRecombinar = {
  gruposRecombinados: number; // grupos que se volvieron a unir en una sola OT
  otsEliminadas: number; // sub-OTs que se colapsaron
};

// Backfill: como ya no se parten las OTs, vuelve a unir en una sola OT los grupos
// de sub-OTs pendientes que quedaron de la etapa en que sí se partía. Sólo toca
// grupos cuyas partes están TODAS pendientes (si alguna ya está en progreso o
// terminada, no se puede unir sin romper el trabajo en curso). La duración se
// recalcula con la matriz. Se corre una vez tras el deploy.
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
    if (ps.length <= 1) continue;
    // Si faltan hermanos del grupo (parteTotal > partes pendientes), alguno ya está
    // en progreso/terminado: no se recombina.
    const total = ps[0].parteTotal ?? ps.length;
    if (ps.length < total) continue;

    // Re-unir los items (por prenda + procesos + descripción) y recalcular duración.
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
          duracionMin: calc.duracionTotal,
          aRevisar: calc.aRevisar,
          urgente: base.urgente,
          fechaNecesaria: base.fechaNecesaria,
          empleadoCargaId: base.empleadoCargaId,
          datosIA: base.datosIA === null ? undefined : (base.datosIA as Prisma.InputJsonValue),
          createdAt,
          items: {
            create: calc.items.map((it) => ({
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
