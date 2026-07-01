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
};

const HORIZONTE_DIAS = 60; // limite de busqueda al asignar

export function minutosTurno(t: { horaInicio: string; horaFin: string }): number {
  return Math.max(0, horaAMin(t.horaFin) - horaAMin(t.horaInicio));
}

// Duracion maxima de una sub-OT: una OT que supere esto se auto-divide en partes.
// Es la capacidad del turno base mas grande (manana/tarde habilitados); asi cada
// parte "entra en un turno". Se excluye el turno "extra" (es eventual). Fallback
// 240min si no hay turnos base configurados.
export function limiteDivisionMin(config: TurnoConfigRow[]): number {
  const base = config.filter((t) => t.tipo !== "extra" && t.habilitado);
  const max = base.reduce((acc, t) => Math.max(acc, minutosTurno(t)), 0);
  return max > 0 ? max : 240;
}

// Turnos habilitados para una fecha. Si el día no atiende, ninguno aplica. El
// turno "extra" solo aplica si además hay un LavDiaExtra habilitado para esa fecha.
export function turnosDelDia(
  fecha: string,
  config: ConfigTurnos,
  diasExtraHabilitados: Set<string>
): TurnoAplicable[] {
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
  const [turnos, dias, extras] = await Promise.all([
    prisma.lavTurnoConfig.findMany(),
    prisma.lavDiaConfig.findMany({ where: { atiende: true }, select: { diaSemana: true } }),
    prisma.lavDiaExtra.findMany({
      where: { habilitado: true, fecha: { gte: fechaDesde, lte: fechaHasta } },
      select: { fecha: true },
    }),
  ]);
  const config: ConfigTurnos = {
    turnos: turnos as TurnoConfigRow[],
    diasAtiende: new Set(dias.map((d) => d.diaSemana)),
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
//    Así se compactan los dias en vez de dejar un hueco y saltar al dia posterior.
//  - En progreso: fijas en su dia (o hoy si cayeron en un dia no laborable/pasado),
//    al frente y en orden de inicio.
//  - Urgentes y "PARA <fecha>" con deadline INMINENTE: al frente de hoy, sin importar
//    la capacidad. Las "PARA <fecha>" con margen fluyen como una OT normal.
//  - Partes de una OT dividida (mismo grupoId): se respeta el orden de parteIndice.
// Se corre tras crear/editar una OT (reasignacion real en DB). Devuelve cuantas movió.
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
    select: {
      id: true,
      estado: true,
      urgente: true,
      fechaNecesaria: true,
      duracionMin: true,
      fechaAsignada: true,
      orden: true,
      empezadoEn: true,
      grupoId: true,
      parteIndice: true,
    },
  });
  if (ots.length === 0) return 0;

  const resultado = new Map<string, string[]>(); // fecha -> ids en orden
  const usado = new Map<string, number>(); // minutos comprometidos por dia
  const colocadas = new Set<string>(); // ids ya ubicados (para respetar orden de partes)
  const push = (fecha: string, id: string) => {
    const arr = resultado.get(fecha) ?? [];
    arr.push(id);
    resultado.set(fecha, arr);
    colocadas.add(id);
  };
  const reservar = (fecha: string, min: number) => usado.set(fecha, (usado.get(fecha) ?? 0) + min);

  // Partes de una OT dividida (mismo grupoId) deben ir en orden: una parte no puede
  // colocarse si un hermano anterior (parteIndice menor) sigue sin ubicar.
  const hermanosPorGrupo = new Map<string, { id: string; idx: number }[]>();
  for (const o of ots) {
    if (o.grupoId == null || o.parteIndice == null) continue;
    const arr = hermanosPorGrupo.get(o.grupoId) ?? [];
    arr.push({ id: o.id, idx: o.parteIndice });
    hermanosPorGrupo.set(o.grupoId, arr);
  }
  const anteriorSinColocar = (o: { grupoId: string | null; parteIndice: number | null }) => {
    if (o.grupoId == null || o.parteIndice == null) return false;
    const hermanos = hermanosPorGrupo.get(o.grupoId) ?? [];
    return hermanos.some((h) => h.idx < o.parteIndice! && !colocadas.has(h.id));
  };

  // 1. En progreso: fijas en su dia, al frente y en orden de inicio.
  const enProgreso = ots
    .filter((o) => o.estado === "en_progreso")
    .sort((a, b) => (a.empezadoEn?.getTime() ?? 0) - (b.empezadoEn?.getTime() ?? 0) || a.orden - b.orden);
  for (const o of enProgreso) {
    const f = esLaborable.has(o.fechaAsignada) && o.fechaAsignada >= hoyLab ? o.fechaAsignada : hoyLab;
    push(f, o.id);
    reservar(f, o.duracionMin);
  }

  // 2. Pendientes en su orden visual actual (ya viene ordenado por la query).
  const pendientes = ots.filter((o) => o.estado === "pendiente");
  const esUrgenteHoy = (o: (typeof pendientes)[number]) =>
    o.urgente || (!!o.fechaNecesaria && deadlineInminente(o.fechaNecesaria, dias));

  // 2a. Urgentes / deadline inminente: al frente de hoy (sin importar capacidad).
  for (const o of pendientes.filter(esUrgenteHoy)) {
    push(hoyLab, o.id);
    reservar(hoyLab, o.duracionMin);
  }

  // 2b. Normales: gap-filling por dia respetando el orden base y el orden de partes.
  const cola = pendientes.filter((o) => !esUrgenteHoy(o));
  for (const d of dias) {
    let restante = d.cap - (usado.get(d.fecha) ?? 0);
    let i = 0;
    while (i < cola.length && restante > 0) {
      if (cola[i].duracionMin <= restante && !anteriorSinColocar(cola[i])) {
        push(d.fecha, cola[i].id);
        restante -= cola[i].duracionMin;
        cola.splice(i, 1); // no avanzar i: reintenta con la siguiente en la misma posicion
      } else {
        i++; // no entra en el hueco (o falta una parte anterior): probar la siguiente
      }
    }
  }
  // Sobrantes (mas grandes que cualquier dia o mas alla del horizonte): al ultimo dia.
  for (const o of cola) push(ultimoLab, o.id);

  // Persistir solo lo que cambió.
  const actual = new Map(ots.map((o) => [o.id, o] as const));
  const updates: ReturnType<typeof prisma.lavOT.update>[] = [];
  for (const [fecha, ids] of resultado) {
    ids.forEach((id, orden) => {
      const o = actual.get(id)!;
      if (o.fechaAsignada !== fecha || o.orden !== orden) {
        updates.push(prisma.lavOT.update({ where: { id }, data: { fechaAsignada: fecha, orden } }));
      }
    });
  }
  if (updates.length === 0) return 0;
  await prisma.$transaction(updates);
  return updates.length;
}
