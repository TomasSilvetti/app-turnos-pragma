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

// Busca el primer dia (desde hoy) con capacidad restante para la OT y devuelve
// la fecha y la posicion (orden) al final de la cola de ese dia. Si la OT no
// entra en ningun dia del horizonte, la coloca en el primer dia con turnos.
export async function asignarOT(duracionMin: number): Promise<{ fechaAsignada: string; orden: number }> {
  const hoy = hoyAR();
  const hasta = sumarDias(hoy, HORIZONTE_DIAS);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);

  // Ocupacion actual por dia (todas las OTs asignadas ocupan tiempo).
  const grupos = await prisma.lavOT.groupBy({
    by: ["fechaAsignada"],
    where: { fechaAsignada: { gte: hoy, lte: hasta } },
    _sum: { duracionMin: true },
    _count: { _all: true },
  });
  const ocupacion = new Map<string, number>();
  const cuenta = new Map<string, number>();
  for (const g of grupos) {
    ocupacion.set(g.fechaAsignada, g._sum.duracionMin ?? 0);
    cuenta.set(g.fechaAsignada, g._count._all);
  }

  let primerDiaConTurnos: string | null = null;
  for (let i = 0; i <= HORIZONTE_DIAS; i++) {
    const fecha = sumarDias(hoy, i);
    const turnos = turnosDelDia(fecha, config, diasExtra);
    const cap = capacidadDia(turnos);
    if (cap === 0) continue; // dia sin turnos (ej fin de semana)
    if (primerDiaConTurnos === null) primerDiaConTurnos = fecha;
    const ocup = ocupacion.get(fecha) ?? 0;
    if (ocup + duracionMin <= cap) {
      return { fechaAsignada: fecha, orden: cuenta.get(fecha) ?? 0 };
    }
  }

  // No entro en ningun lado: al primer dia con turnos (overflow controlado).
  const fallback = primerDiaConTurnos ?? hoy;
  return { fechaAsignada: fallback, orden: cuenta.get(fallback) ?? 0 };
}
