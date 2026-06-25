import { prisma } from "@/lib/prisma";
import { diaSemanaDe, horaAMin, hoyAR, sumarDias } from "./fecha";

export type TurnoAplicable = {
  tipo: string;
  horaInicio: string;
  horaFin: string;
  minutos: number;
};

type TurnoConfig = {
  tipo: string;
  horaInicio: string;
  horaFin: string;
  diasSemana: number[];
  habilitado: boolean;
};

const HORIZONTE_DIAS = 60; // limite de busqueda al asignar

function minutosTurno(t: { horaInicio: string; horaFin: string }): number {
  return Math.max(0, horaAMin(t.horaFin) - horaAMin(t.horaInicio));
}

// Turnos habilitados para una fecha. El turno "extra" solo aplica si hay un
// LavDiaExtra habilitado para esa fecha; el resto, segun su config base.
export function turnosDelDia(
  fecha: string,
  config: TurnoConfig[],
  diasExtraHabilitados: Set<string>
): TurnoAplicable[] {
  const dia = diaSemanaDe(fecha);
  const res: TurnoAplicable[] = [];
  for (const t of config) {
    const aplicaDia = t.diasSemana.includes(dia);
    if (!aplicaDia) continue;
    if (t.tipo === "extra") {
      if (!diasExtraHabilitados.has(fecha)) continue;
    } else if (!t.habilitado) {
      continue;
    }
    res.push({ tipo: t.tipo, horaInicio: t.horaInicio, horaFin: t.horaFin, minutos: minutosTurno(t) });
  }
  return res.sort((a, b) => horaAMin(a.horaInicio) - horaAMin(b.horaInicio));
}

export function capacidadDia(turnos: TurnoAplicable[]): number {
  return turnos.reduce((acc, t) => acc + t.minutos, 0);
}

// Carga la config de turnos y los dias extra habilitados en un rango.
export async function cargarConfigTurnos(fechaDesde: string, fechaHasta: string) {
  const [config, extras] = await Promise.all([
    prisma.lavTurnoConfig.findMany(),
    prisma.lavDiaExtra.findMany({
      where: { habilitado: true, fecha: { gte: fechaDesde, lte: fechaHasta } },
      select: { fecha: true },
    }),
  ]);
  return {
    config: config as TurnoConfig[],
    diasExtra: new Set(extras.map((e) => e.fecha)),
  };
}

// Opciones de prioridad al cargar una OT (de la deteccion por foto).
export type PrioridadOT = {
  urgente?: boolean; // "URGENTE": al frente del dia de hoy
  fechaNecesaria?: string | null; // "PARA <fecha>": al frente del ultimo dia laborable previo
};

// Asigna la OT a un dia y una posicion (orden) en su cola:
// - urgente: al frente del primer dia laborable (hoy), sin importar la capacidad.
// - fechaNecesaria: al frente del ultimo dia laborable anterior a esa fecha.
// - normal: primer dia con capacidad restante, al final de la cola. Si no entra
//   en ningun dia del horizonte, al primer dia con turnos (overflow controlado).
export async function asignarOT(
  duracionMin: number,
  prioridad: PrioridadOT = {}
): Promise<{ fechaAsignada: string; orden: number }> {
  const hoy = hoyAR();
  const hasta = sumarDias(hoy, HORIZONTE_DIAS);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);

  // Ocupacion, cantidad y menor orden actual por dia.
  const grupos = await prisma.lavOT.groupBy({
    by: ["fechaAsignada"],
    where: { fechaAsignada: { gte: hoy, lte: hasta } },
    _sum: { duracionMin: true },
    _count: { _all: true },
    _min: { orden: true },
  });
  const ocupacion = new Map<string, number>();
  const cuenta = new Map<string, number>();
  const minOrden = new Map<string, number>();
  for (const g of grupos) {
    ocupacion.set(g.fechaAsignada, g._sum.duracionMin ?? 0);
    cuenta.set(g.fechaAsignada, g._count._all);
    minOrden.set(g.fechaAsignada, g._min.orden ?? 0);
  }

  const esLaborable = (f: string) => capacidadDia(turnosDelDia(f, config, diasExtra)) > 0;
  // Orden estrictamente menor a todo lo que ya hay ese dia → queda al frente.
  const ordenAlFrente = (f: string) => (minOrden.get(f) ?? 0) - 1;

  // Primer dia laborable desde hoy (destino de los urgentes y fallback).
  let primerLaborable = hoy;
  for (let i = 0; i <= HORIZONTE_DIAS; i++) {
    const f = sumarDias(hoy, i);
    if (esLaborable(f)) {
      primerLaborable = f;
      break;
    }
  }

  // URGENTE: al frente del dia de hoy (primer dia laborable).
  if (prioridad.urgente) {
    return { fechaAsignada: primerLaborable, orden: ordenAlFrente(primerLaborable) };
  }

  // "PARA <fecha>": al frente del ultimo dia laborable anterior a esa fecha.
  if (prioridad.fechaNecesaria) {
    let target: string | null = null;
    for (let i = 0; i <= HORIZONTE_DIAS; i++) {
      const f = sumarDias(hoy, i);
      if (f >= prioridad.fechaNecesaria) break;
      if (esLaborable(f)) target = f;
    }
    const dest = target ?? primerLaborable;
    return { fechaAsignada: dest, orden: ordenAlFrente(dest) };
  }

  // Normal: primer dia con capacidad restante, al final de la cola.
  for (let i = 0; i <= HORIZONTE_DIAS; i++) {
    const fecha = sumarDias(hoy, i);
    const cap = capacidadDia(turnosDelDia(fecha, config, diasExtra));
    if (cap === 0) continue; // dia sin turnos (ej fin de semana)
    const ocup = ocupacion.get(fecha) ?? 0;
    if (ocup + duracionMin <= cap) {
      return { fechaAsignada: fecha, orden: cuenta.get(fecha) ?? 0 };
    }
  }

  // No entro en ningun lado: al primer dia con turnos (overflow controlado).
  return { fechaAsignada: primerLaborable, orden: cuenta.get(primerLaborable) ?? 0 };
}
