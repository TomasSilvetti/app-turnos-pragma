import { prisma } from "@/lib/prisma";
import { ahoraAR, diaSemanaDe, etiquetaDia, sumarDias } from "./fecha";
import { cargarConfigTurnos, capacidadDia, deadlineInminente, turnosDelDia, type TurnoAplicable } from "./capacidad";

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
  // La deadline "PARA <fecha>" ya está encima: se prioriza y muestra como urgente.
  urgentePorDeadline: boolean;
  fechaNecesaria: string | null;
  empezadoEn: string | null;
  terminadoEn: string | null;
  empleadoTrabajo: string | null;
  items: { descripcion: string; cantidad: number; prendaId: string | null; procesoIds: string[]; procesos: string[]; duracionMin: number }[];
  puedeEmpezar: boolean;
  // Division de OTs grandes: la sub-OT lleva su indice de parte (2/6). Cuando todas
  // las partes de un grupo estan terminadas, se reemplazan por una unica card
  // combinada (partesCompletadas seteado, sin parteIndice).
  grupoId: string | null;
  parteIndice: number | null;
  parteTotal: number | null;
  partesCompletadas: number | null;
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
    // Las OTs terminadas desaparecen del tablero (quedan en el histórico/DB, pero
    // no se muestran en la cola de trabajo).
    where: { fechaAsignada: { gte: hoy, lte: hasta }, estado: { not: "terminado" } },
    orderBy: [{ fechaAsignada: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    include: {
      items: { select: { descripcion: true, cantidad: true, prendaId: true, procesoIds: true, duracionMin: true } },
      empleadoTrabajo: { select: { nombre: true } },
    },
  });

  // Resolver nombres de procesos para mostrar en las tarjetas.
  const procesos = await prisma.lavProceso.findMany({ select: { id: true, nombre: true } });
  const nombreProceso = new Map(procesos.map((p) => [p.id, p.nombre]));

  // Dias laborables desde hoy (para evaluar la cercania de las deadlines "PARA <fecha>").
  const laborables: { fecha: string }[] = [];
  for (let i = 0; i <= DIAS_VISIBLES * 2 + 7; i++) {
    const f = sumarDias(hoy, i);
    if (turnosDelDia(f, config, diasExtra).length > 0) laborables.push({ fecha: f });
  }
  // Deadline "PARA <fecha>" inminente: la OT pendiente se muestra en la columna de
  // hoy (aunque en DB siga en otro dia), al frente, para que se priorice.
  const esInminente = (ot: (typeof ots)[number]) =>
    ot.estado === "pendiente" && !!ot.fechaNecesaria && deadlineInminente(ot.fechaNecesaria, laborables);

  const porDia = new Map<string, typeof ots>();
  for (const ot of ots) {
    const promover = esInminente(ot) && ot.fechaAsignada !== primerLaborable;
    const fecha = promover ? primerLaborable : ot.fechaAsignada;
    const arr = porDia.get(fecha) ?? [];
    if (promover) arr.unshift(ot); // al frente de hoy
    else arr.push(ot);
    porDia.set(fecha, arr);
  }

  const dias: DiaSnap[] = [];
  // Avanzamos por el calendario agregando solo días con turnos (laborables),
  // hasta juntar DIAS_VISIBLES.
  for (let offset = 0; dias.length < DIAS_VISIBLES && offset <= DIAS_VISIBLES * 2 + 7; offset++) {
    const fecha = sumarDias(hoy, offset);
    const turnos = turnosDelDia(fecha, config, diasExtra);
    if (turnos.length === 0) continue; // saltar fines de semana / días sin turnos
    const delDia = porDia.get(fecha) ?? [];
    const { dia, fechaCorta } = etiquetaDia(fecha);

    const diaSem = diaSemanaDe(fecha);
    const extraRow = config.turnos.find((t) => t.tipo === "extra" && t.diaSemana === diaSem);
    const extra: ExtraInfo | null =
      extraRow && extraRow.habilitado && config.diasAtiende.has(diaSem)
        ? {
            disponible: true,
            activo: diasExtra.has(fecha),
            horaInicio: extraRow.horaInicio,
            horaFin: extraRow.horaFin,
          }
        : null;

    const otsSnap: OTSnap[] = delDia.map((ot) => ({
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
      urgentePorDeadline: esInminente(ot),
      fechaNecesaria: ot.fechaNecesaria,
      empezadoEn: ot.empezadoEn?.toISOString() ?? null,
      terminadoEn: ot.terminadoEn?.toISOString() ?? null,
      empleadoTrabajo: ot.empleadoTrabajo?.nombre ?? null,
      items: ot.items.map((it) => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        prendaId: it.prendaId,
        procesoIds: it.procesoIds,
        procesos: it.procesoIds.map((id) => nombreProceso.get(id) ?? "").filter(Boolean),
        duracionMin: it.duracionMin,
      })),
      // Cualquier OT pendiente puede empezarse (varias en simultaneo, en cualquier
      // dia). Al empezarla se reubica en la columna de hoy.
      puedeEmpezar: ot.estado === "pendiente",
      grupoId: ot.grupoId,
      parteIndice: ot.parteIndice,
      parteTotal: ot.parteTotal,
      partesCompletadas: null,
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

  // Recombinar OTs divididas: cuando TODAS las partes de un grupo estan terminadas,
  // se reemplazan sus N cards por una unica card combinada (con la duracion total y
  // los items fusionados). Se consultan todas las partes del grupo aparte porque las
  // terminadas en dias pasados ya no entran en el rango del tablero.
  const grupoIds = [
    ...new Set(
      dias.flatMap((d) => d.ots).map((o) => o.grupoId).filter((g): g is string => Boolean(g))
    ),
  ];
  if (grupoIds.length > 0) {
    const partes = await prisma.lavOT.findMany({
      where: { grupoId: { in: grupoIds } },
      include: {
        items: { select: { descripcion: true, cantidad: true, prendaId: true, procesoIds: true, duracionMin: true } },
        empleadoTrabajo: { select: { nombre: true } },
      },
    });
    const porGrupo = new Map<string, typeof partes>();
    for (const p of partes) {
      const arr = porGrupo.get(p.grupoId!) ?? [];
      arr.push(p);
      porGrupo.set(p.grupoId!, arr);
    }

    for (const [gid, ps] of porGrupo) {
      const todasTerminadas = ps.length > 0 && ps.every((p) => p.estado === "terminado");
      if (!todasTerminadas) continue;

      // Quitar las partes del grupo de todos los dias y quedarnos con el dia visible
      // mas tardio que tenia una (ahi va la card combinada).
      let destino: DiaSnap | null = null;
      for (const d of dias) {
        if (d.ots.some((o) => o.grupoId === gid) && (!destino || d.fecha > destino.fecha)) {
          destino = d;
        }
        d.ots = d.ots.filter((o) => o.grupoId !== gid);
      }
      if (!destino) continue; // todas las partes ya scrollearon fuera del tablero

      // Fusionar items por prenda + procesos (reconstruye la OT original).
      const mergeItems = new Map<string, OTSnap["items"][number]>();
      for (const p of ps) {
        for (const it of p.items) {
          const key = `${it.prendaId ?? ""}|${[...it.procesoIds].sort().join(",")}|${it.descripcion}`;
          const prev = mergeItems.get(key);
          if (prev) {
            prev.cantidad += it.cantidad;
            prev.duracionMin += it.duracionMin;
          } else {
            mergeItems.set(key, {
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              prendaId: it.prendaId,
              procesoIds: it.procesoIds,
              procesos: it.procesoIds.map((id) => nombreProceso.get(id) ?? "").filter(Boolean),
              duracionMin: it.duracionMin,
            });
          }
        }
      }

      const ref = ps[0];
      const ultimaTerminada = ps.reduce((a, b) =>
        (b.terminadoEn?.getTime() ?? 0) > (a.terminadoEn?.getTime() ?? 0) ? b : a
      );
      destino.ots.push({
        id: `grupo-${gid}`,
        numero: ref.numero,
        nombreCliente: ref.nombreCliente,
        telefono: ref.telefono,
        domicilio: ref.domicilio,
        estado: "terminado",
        duracionMin: ps.reduce((acc, p) => acc + p.duracionMin, 0),
        orden: 0,
        aRevisar: ps.some((p) => p.aRevisar),
        urgente: false,
        urgentePorDeadline: false,
        fechaNecesaria: ref.fechaNecesaria,
        empezadoEn: null,
        terminadoEn: ultimaTerminada.terminadoEn?.toISOString() ?? null,
        empleadoTrabajo: ultimaTerminada.empleadoTrabajo?.nombre ?? null,
        items: [...mergeItems.values()],
        puedeEmpezar: false,
        grupoId: gid,
        parteIndice: null,
        parteTotal: ps.length,
        partesCompletadas: ps.length,
      });
    }
  }

  return { dias, version: await versionTablero() };
}
