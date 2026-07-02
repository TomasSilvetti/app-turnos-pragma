import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { limiteDivisionMin, recompactar } from "./capacidad";
import { dividirEnPartes } from "./dividir";
import type { ItemCalculado } from "./duraciones";

export type ResultadoRedividir = {
  divididas: number; // OTs grandes que se partieron
  partesCreadas: number; // total de sub-OTs generadas
  limite: number; // límite de división usado (capacidad del turno base mayor)
};

// Backfill: parte las OTs pendientes que quedaron enteras y superan la capacidad
// de un turno (típicamente cargadas antes de existir la auto-división). Reutiliza
// la MISMA lógica que la creación: dividirEnPartes + grupoId + recompactar.
//
// Sólo toca OTs `pendiente` sin grupo (las ya divididas o en progreso/terminadas
// se dejan como están). Una OT cuya única unidad ya supera el límite no se puede
// partir: se deja igual.
export async function redividirGrandes(): Promise<ResultadoRedividir> {
  const turnos = await prisma.lavTurnoConfig.findMany();
  const limite = limiteDivisionMin(turnos as Parameters<typeof limiteDivisionMin>[0]);

  const grandes = await prisma.lavOT.findMany({
    where: { estado: "pendiente", grupoId: null, duracionMin: { gt: limite } },
    include: { items: true },
  });

  let divididas = 0;
  let partesCreadas = 0;

  for (const ot of grandes) {
    const items: ItemCalculado[] = ot.items.map((it) => ({
      prendaId: it.prendaId,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      procesoIds: it.procesoIds,
      procesos: [],
      duracionMin: it.duracionMin,
      sinTiempos: false,
    }));

    const partes = dividirEnPartes(items, limite);
    if (partes.length <= 1) continue; // no se pudo partir (una sola unidad gigante)

    const grupoId = crypto.randomUUID();
    const total = partes.length;

    await prisma.$transaction(async (tx) => {
      // Se reemplaza la OT original por sus partes (sus items caen por cascade).
      await tx.lavOT.delete({ where: { id: ot.id } });
      for (let i = 0; i < partes.length; i++) {
        const parte = partes[i];
        await tx.lavOT.create({
          data: {
            numero: ot.numero,
            nombreCliente: ot.nombreCliente,
            telefono: ot.telefono,
            domicilio: ot.domicilio,
            fechaTicket: ot.fechaTicket,
            estado: "pendiente",
            // La posición inicial es la de la OT original; recompactar la reacomoda.
            fechaAsignada: ot.fechaAsignada,
            orden: ot.orden,
            duracionMin: parte.duracionMin,
            aRevisar: ot.aRevisar,
            urgente: ot.urgente,
            fechaNecesaria: ot.fechaNecesaria,
            grupoId,
            parteIndice: i + 1,
            parteTotal: total,
            empleadoCargaId: ot.empleadoCargaId,
            datosIA: ot.datosIA === null ? undefined : (ot.datosIA as Prisma.InputJsonValue),
            // Se conserva el createdAt para que el orden de llegada no cambie.
            createdAt: ot.createdAt,
            items: {
              create: parte.items.map((it) => ({
                descripcion: it.descripcion,
                prendaId: it.prendaId,
                cantidad: it.cantidad,
                procesoIds: it.procesoIds,
                duracionMin: it.duracionMin,
              })),
            },
          },
        });
        partesCreadas++;
      }
    });
    divididas++;
  }

  // Una sola pasada de gap-filling al final reparte las nuevas partes entre días.
  if (divididas > 0) await recompactar();

  return { divididas, partesCreadas, limite };
}
