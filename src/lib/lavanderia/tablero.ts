import { prisma } from "@/lib/prisma";
import { ahoraAR, diaSemanaDe, etiquetaDia, sumarDias } from "./fecha";
import { cargarConfigTurnos, capacidadDia, turnosDelDia, type TurnoAplicable } from "./capacidad";

// Estado del turno extra para un día (para mostrar el gap clickeable en admin).
export type ExtraInfo = {
  disponible: boolean; // el día es elegible para turno extra (según config)
  activo: boolean; // hay un LavDiaExtra habilitado para ese día
  horaInicio: string;
  horaFin: string;
};

export const DIAS_VISIBLES = 7;

export type OTSnap = {
  id: string;
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  estado: string;
  duracionMin: number;
  orden: number;
  aRevisar: boolean;
  urgente: boolean;
  fechaNecesaria: string | null;
  empezadoEn: string | null;
  terminadoEn: string | null;
  empleadoTrabajo: string | null;
  items: { descripcion: string; cantidad: number; prendaId: string | null; procesos: string[]; duracionMin: number; monto: number }[];
  puedeEmpezar: boolean;
};

export type DiaSnap = {
  fecha: string;
  esHoy: boolean;
  dia: string;
  fechaCorta: string;
  turnos: TurnoAplicable[];
  capacidadMin: number;
  ocupacionMin: number;
  ahoraMin: number | null; // minutos desde medianoche, solo el dia de hoy
  extra: ExtraInfo | null;
  ots: OTSnap[];
};

export type TableroSnapshot = { dias: DiaSnap[]; version: string };

// Arrastra al primer dia laborable las OTs no terminadas de dias pasados.
// Se les da orden negativo para que queden al frente de la cola.
async function migrarAtrasadas(destino: string): Promise<void> {
  const atrasadas = await prisma.lavOT.findMany({
    where: { fechaAsignada: { lt: destino }, estado: { not: "terminado" } },
    orderBy: [{ fechaAsignada: "asc" }, { orden: "asc" }],
    select: { id: true },
  });
  if (atrasadas.length === 0) return;
  await prisma.$transaction(
    atrasadas.map((ot, i) =>
      prisma.lavOT.update({ where: { id: ot.id }, data: { fechaAsignada: destino, orden: -1000 + i } })
    )
  );
}

export async function versionTablero(): Promise<string> {
  const agg = await prisma.lavOT.aggregate({ _max: { updatedAt: true }, _count: { _all: true } });
  return `${agg._max.updatedAt?.getTime() ?? 0}-${agg._count._all}`;
}

export async function getTablero(): Promise<TableroSnapshot> {
  const { fecha: hoy, minutos: ahoraMin } = ahoraAR();

  // Rango amplio: mostramos DIAS_VISIBLES días LABORABLES (con turnos), salteando
  // fines de semana, así que necesitamos cubrir varias semanas de calendario.
  const hasta = sumarDias(hoy, DIAS_VISIBLES * 2 + 7);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);

  // Primer día laborable desde hoy (a donde se arrastran las OTs atrasadas).
  let primerLaborable = hoy;
  for (let i = 0; i < 14; i++) {
    const f = sumarDias(hoy, i);
    if (turnosDelDia(f, config, diasExtra).length > 0) {
      primerLaborable = f;
      break;
    }
  }
  await migrarAtrasadas(primerLaborable);

  const ots = await prisma.lavOT.findMany({
    where: { fechaAsignada: { gte: hoy, lte: hasta } },
    orderBy: [{ fechaAsignada: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    include: {
      items: { select: { descripcion: true, cantidad: true, prendaId: true, procesos: true, duracionMin: true, monto: true } },
      empleadoTrabajo: { select: { nombre: true } },
    },
  });

  const porDia = new Map<string, typeof ots>();
  for (const ot of ots) {
    const arr = porDia.get(ot.fechaAsignada) ?? [];
    arr.push(ot);
    porDia.set(ot.fechaAsignada, arr);
  }

  const cfgExtra = config.find((t) => t.tipo === "extra");

  const dias: DiaSnap[] = [];
  // Avanzamos por el calendario agregando solo días con turnos (laborables),
  // hasta juntar DIAS_VISIBLES.
  for (let offset = 0; dias.length < DIAS_VISIBLES && offset <= DIAS_VISIBLES * 2 + 7; offset++) {
    const fecha = sumarDias(hoy, offset);
    const turnos = turnosDelDia(fecha, config, diasExtra);
    if (turnos.length === 0) continue; // saltar fines de semana / días sin turnos
    const delDia = porDia.get(fecha) ?? [];
    const { dia, fechaCorta } = etiquetaDia(fecha);

    const extra: ExtraInfo | null = cfgExtra
      ? {
          disponible: cfgExtra.diasSemana.includes(diaSemanaDe(fecha)),
          activo: diasExtra.has(fecha),
          horaInicio: cfgExtra.horaInicio,
          horaFin: cfgExtra.horaFin,
        }
      : null;

    const otsSnap: OTSnap[] = delDia.map((ot, idx) => ({
      id: ot.id,
      numero: ot.numero,
      nombreCliente: ot.nombreCliente,
      telefono: ot.telefono,
      domicilio: ot.domicilio,
      estado: ot.estado,
      duracionMin: ot.duracionMin,
      orden: ot.orden,
      aRevisar: ot.aRevisar,
      urgente: ot.urgente,
      fechaNecesaria: ot.fechaNecesaria,
      empezadoEn: ot.empezadoEn?.toISOString() ?? null,
      terminadoEn: ot.terminadoEn?.toISOString() ?? null,
      empleadoTrabajo: ot.empleadoTrabajo?.nombre ?? null,
      items: ot.items.map((it) => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        prendaId: it.prendaId,
        procesos: it.procesos,
        duracionMin: it.duracionMin,
        monto: it.monto,
      })),
      // Solo puede empezar la primera OT pendiente del dia (la anterior ya debe
      // estar empezada o terminada).
      puedeEmpezar: ot.estado === "pendiente" && (idx === 0 || delDia[idx - 1].estado !== "pendiente"),
    }));

    dias.push({
      fecha,
      esHoy: fecha === hoy,
      dia,
      fechaCorta,
      turnos,
      capacidadMin: capacidadDia(turnos),
      ocupacionMin: delDia.reduce((acc, o) => acc + o.duracionMin, 0),
      ahoraMin: fecha === hoy ? ahoraMin : null,
      extra,
      ots: otsSnap,
    });
  }

  return { dias, version: await versionTablero() };
}
