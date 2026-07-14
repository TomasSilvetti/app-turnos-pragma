import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { diaSemanaDe, horaAMin, hoyAR, sumarDias } from "./fecha";

export type TurnoAplicable = {
  tipo: string;
  horaInicio: string;
  horaFin: string;
  minutos: number;
};

export type TurnoConfigRow = {
  diaSemana: number;
  tipo: string;
  horaInicio: string;
  horaFin: string;
  habilitado: boolean;
};

export type ConfigTurnos = {
  turnos: TurnoConfigRow[];
  diasAtiende: Set<number>; // días de la semana con atiende=true
  feriados: Set<string>; // fechas yyyy-MM-dd marcadas como feriado (sin turnos)
};

const HORIZONTE_DIAS = 60; // limite de busqueda al asignar

export function minutosTurno(t: { horaInicio: string; horaFin: string }): number {
  return Math.max(0, horaAMin(t.horaFin) - horaAMin(t.horaInicio));
}

// Turnos habilitados para una fecha. Si el día no atiende, ninguno aplica. El
// turno "extra" solo aplica si además hay un LavDiaExtra habilitado para esa fecha.
export function turnosDelDia(
  fecha: string,
  config: ConfigTurnos,
  diasExtraHabilitados: Set<string>
): TurnoAplicable[] {
  if (config.feriados.has(fecha)) return []; // feriado: el dia no trabaja
  const dia = diaSemanaDe(fecha);
  if (!config.diasAtiende.has(dia)) return [];
  const res: TurnoAplicable[] = [];
  for (const t of config.turnos) {
    if (t.diaSemana !== dia || !t.habilitado) continue;
    if (t.tipo === "extra" && !diasExtraHabilitados.has(fecha)) continue;
    res.push({ tipo: t.tipo, horaInicio: t.horaInicio, horaFin: t.horaFin, minutos: minutosTurno(t) });
  }
  return res.sort((a, b) => horaAMin(a.horaInicio) - horaAMin(b.horaInicio));
}

export function capacidadDia(turnos: TurnoAplicable[]): number {
  return turnos.reduce((acc, t) => acc + t.minutos, 0);
}

// Primer dia laborable desde hoy (la columna "hoy" del tablero). Es a donde se
// manda una OT cuando se la empieza.
export async function primerDiaLaborable(): Promise<string> {
  const hoy = hoyAR();
  const hasta = sumarDias(hoy, HORIZONTE_DIAS);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);
  for (let i = 0; i <= HORIZONTE_DIAS; i++) {
    const f = sumarDias(hoy, i);
    if (capacidadDia(turnosDelDia(f, config, diasExtra)) > 0) return f;
  }
  return hoy;
}

// Carga la config de turnos y los dias extra habilitados en un rango.
export async function cargarConfigTurnos(fechaDesde: string, fechaHasta: string) {
  const [turnos, dias, extras, feriados] = await Promise.all([
    prisma.lavTurnoConfig.findMany(),
    prisma.lavDiaConfig.findMany({ where: { atiende: true }, select: { diaSemana: true } }),
    prisma.lavDiaExtra.findMany({
      where: { habilitado: true, fecha: { gte: fechaDesde, lte: fechaHasta } },
      select: { fecha: true },
    }),
    prisma.lavDiaFeriado.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      select: { fecha: true },
    }),
  ]);
  const config: ConfigTurnos = {
    turnos: turnos as TurnoConfigRow[],
    diasAtiende: new Set(dias.map((d) => d.diaSemana)),
    feriados: new Set(feriados.map((f) => f.fecha)),
  };
  return { config, diasExtra: new Set(extras.map((e) => e.fecha)) };
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
  prioridad: PrioridadOT = {},
  excluirId?: string // al reasignar una OT editada, no contarla en la ocupacion
): Promise<{ fechaAsignada: string; orden: number }> {
  const hoy = hoyAR();
  const hasta = sumarDias(hoy, HORIZONTE_DIAS);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);

  // Ocupacion, cantidad y menor orden actual por dia.
  const grupos = await prisma.lavOT.groupBy({
    by: ["fechaAsignada"],
    where: { fechaAsignada: { gte: hoy, lte: hasta }, ...(excluirId ? { id: { not: excluirId } } : {}) },
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

  // "PARA <fecha>": al frente del ultimo dia laborable anterior a esa fecha.
  // Tiene prioridad sobre "urgente": si el ticket trae fecha limite, manda la
  // fecha (se coloca el dia anterior al limite) aunque tambien diga URGENTE.
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

  // URGENTE (sin fecha limite): al frente del dia de hoy (primer dia laborable).
  if (prioridad.urgente) {
    return { fechaAsignada: primerLaborable, orden: ordenAlFrente(primerLaborable) };
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

// Dias laborables (con capacidad > 0) desde hoy hasta el horizonte, con su capacidad.
function diasLaborables(
  hoy: string,
  config: ConfigTurnos,
  diasExtra: Set<string>
): { fecha: string; cap: number }[] {
  const dias: { fecha: string; cap: number }[] = [];
  for (let i = 0; i <= HORIZONTE_DIAS; i++) {
    const f = sumarDias(hoy, i);
    const cap = capacidadDia(turnosDelDia(f, config, diasExtra));
    if (cap > 0) dias.push({ fecha: f, cap });
  }
  return dias;
}

// ¿Se acerca la deadline de una OT "PARA <fecha>"? Es inminente cuando el primer
// dia laborable (hoy) ya alcanzó al ultimo dia laborable ANTERIOR a la fecha
// necesaria: es el ultimo dia util para tenerla lista, o ya se pasó. Mientras haya
// margen (hay dias laborables entre hoy y la fecha) NO es inminente y la OT fluye
// como una mas en la cola.
export function deadlineInminente(fechaNecesaria: string, dias: { fecha: string }[]): boolean {
  if (dias.length === 0) return true;
  const hoy = dias[0].fecha;
  let ultimoUtil: string | null = null;
  for (const d of dias) {
    if (d.fecha >= fechaNecesaria) break;
    ultimoUtil = d.fecha;
  }
  if (ultimoUtil === null) return true; // sin laborable previo: la fecha es hoy o ya pasó
  return hoy >= ultimoUtil;
}

// Re-empaqueta TODA la cola de OTs vivas hacia adelante rellenando huecos (gap-filling):
//  - Orden base: el visual actual (fechaAsignada, orden, createdAt), que refleja el
//    orden de llegada y respeta reordenamientos manuales previos.
//  - Cuando la proxima OT no entra en el hueco restante de un dia, se itera sobre las
//    siguientes de la cola buscando una que sí entre antes de pasar al dia siguiente.
//  - Las OTs NUNCA se parten: siempre se mueven enteras. Una OT que no entra en
//    ningun dia se apila igual (puede desbordar su dia).
// Se corre tras crear/editar/terminar una OT y en el cron-minuto. Devuelve cuantas
// operaciones de DB hizo.
export async function recompactar(): Promise<number> {
  const hoy = hoyAR();
  const hasta = sumarDias(hoy, HORIZONTE_DIAS);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);

  const dias = diasLaborables(hoy, config, diasExtra);
  if (dias.length === 0) return 0;
  const hoyLab = dias[0].fecha;
  const ultimoLab = dias[dias.length - 1].fecha;
  const esLaborable = new Set(dias.map((d) => d.fecha));

  const ots = await prisma.lavOT.findMany({
    where: { estado: { in: ["pendiente", "en_progreso"] } },
    orderBy: [{ fechaAsignada: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });
  if (ots.length === 0) return 0;
  type OTFull = (typeof ots)[number];

  // Una colocacion es una OT (entera) ubicada en un dia.
  type Colocacion = { ot: OTFull; fecha: string };
  const colocaciones: Colocacion[] = [];
  const usado = new Map<string, number>();
  const reservar = (fecha: string, min: number) => usado.set(fecha, (usado.get(fecha) ?? 0) + min);
  const colocarEntera = (o: OTFull, fecha: string) => {
    colocaciones.push({ ot: o, fecha });
    reservar(fecha, o.duracionMin);
  };

  // 1. En progreso: fijas en su dia, al frente y en orden de inicio.
  const enProgreso = ots
    .filter((o) => o.estado === "en_progreso")
    .sort((a, b) => (a.empezadoEn?.getTime() ?? 0) - (b.empezadoEn?.getTime() ?? 0) || a.orden - b.orden);
  for (const o of enProgreso) {
    const f = esLaborable.has(o.fechaAsignada) && o.fechaAsignada >= hoyLab ? o.fechaAsignada : hoyLab;
    colocarEntera(o, f);
  }

  // 2. Pendientes en su orden visual actual (ya viene ordenado por la query).
  const pendientes = ots.filter((o) => o.estado === "pendiente");
  const esUrgenteHoy = (o: OTFull) =>
    o.urgente || (!!o.fechaNecesaria && deadlineInminente(o.fechaNecesaria, dias));

  // 2a. Urgentes / deadline inminente: al frente de hoy (sin importar capacidad).
  for (const o of pendientes.filter(esUrgenteHoy)) colocarEntera(o, hoyLab);

  // 2b. Normales: gap-filling por dia respetando el orden de llegada. Si la proxima
  // OT no entra en el hueco del dia, se saltea y se prueba la siguiente; asi se
  // adelantan OTs de mas atras para llenar huecos. Siempre enteras.
  const cola = pendientes.filter((o) => !esUrgenteHoy(o));
  for (const d of dias) {
    let restante = d.cap - (usado.get(d.fecha) ?? 0);
    let i = 0;
    while (i < cola.length && restante > 0) {
      if (cola[i].duracionMin <= restante) {
        colocarEntera(cola[i], d.fecha);
        restante -= cola[i].duracionMin;
        cola.splice(i, 1);
      } else {
        i++;
      }
    }
  }
  for (const o of cola) colocarEntera(o, ultimoLab); // sobrantes (no entran en ningun dia) al ultimo

  // --- Materializar --- cada OT es una sola pieza; solo se actualiza su posicion.
  const ordenDe = new Map<Colocacion, number>();
  for (const d of dias) {
    colocaciones.filter((c) => c.fecha === d.fecha).forEach((c, i) => ordenDe.set(c, i));
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const c of colocaciones) {
    const o = c.ot;
    const orden = ordenDe.get(c) ?? 0;
    const data: Prisma.LavOTUpdateInput = {};
    if (o.fechaAsignada !== c.fecha) data.fechaAsignada = c.fecha;
    if (o.orden !== orden) data.orden = orden;
    if (Object.keys(data).length > 0) ops.push(prisma.lavOT.update({ where: { id: o.id }, data }));
  }

  if (ops.length === 0) return 0;
  await prisma.$transaction(ops);
  return ops.length;
}
