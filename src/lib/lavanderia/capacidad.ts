import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { diaSemanaDe, horaAMin, hoyAR, sumarDias } from "./fecha";
import { dividirEnPartes } from "./dividir";

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

// Items de una OT en la forma minima para reubicar/partir.
type ItemLite = { descripcion: string; prendaId: string | null; cantidad: number; procesoIds: string[]; duracionMin: number };

// No se crean fragmentos de relleno menores a esto (evita fragmentar de mas).
const MIN_FRAGMENTO_MIN = 60;

// Parte los items en una cabeza que entra en `limiteMin` (a nivel de unidades) y
// el resto (cola). Reutiliza el mismo packer que la division de OTs.
function partirPorCapacidad(items: ItemLite[], limiteMin: number): {
  head: { items: ItemLite[]; dur: number };
  tail: { items: ItemLite[]; dur: number };
} {
  const calc = items.map((it) => ({
    prendaId: it.prendaId,
    descripcion: it.descripcion,
    cantidad: it.cantidad,
    procesoIds: it.procesoIds,
    procesos: [] as string[],
    duracionMin: it.duracionMin,
    sinTiempos: false,
  }));
  const partes = dividirEnPartes(calc, limiteMin);
  const toLite = (arr: (typeof partes)[number]["items"]): ItemLite[] =>
    arr.map((p) => ({ descripcion: p.descripcion, prendaId: p.prendaId, cantidad: p.cantidad, procesoIds: p.procesoIds, duracionMin: p.duracionMin }));
  const headItems = toLite(partes[0].items);
  const tailItems = partes.slice(1).flatMap((p) => toLite(p.items));
  return {
    head: { items: headItems, dur: partes[0].duracionMin },
    tail: { items: tailItems, dur: tailItems.reduce((a, i) => a + i.duracionMin, 0) },
  };
}

// Re-empaqueta TODA la cola de OTs vivas hacia adelante rellenando huecos (gap-filling):
//  - Orden base: el visual actual (fechaAsignada, orden, createdAt), que refleja el
//    orden de llegada y respeta reordenamientos manuales previos.
//  - Cuando la proxima OT no entra en el hueco restante de un dia, se itera sobre las
//    siguientes de la cola buscando una que sí entre antes de pasar al dia siguiente.
//  - Fill inteligente: si un dia laborable queda VACIO (p.ej. un sabado de 4h donde
//    no entra ninguna sub-OT), se parte la OT pendiente mas proxima de un dia
//    posterior (a nivel de unidades) para ocupar ese dia. Las partes comparten
//    grupoId y se renumeran; se recombinan al terminar (como cualquier OT dividida).
//  - En progreso / urgentes / "PARA <fecha>" inminentes: nunca se parten.
// Se corre tras crear/editar una OT. Devuelve cuantas operaciones de DB hizo.
export async function recompactar(): Promise<number> {
  const hoy = hoyAR();
  const hasta = sumarDias(hoy, HORIZONTE_DIAS);
  const { config, diasExtra } = await cargarConfigTurnos(hoy, hasta);

  const dias = diasLaborables(hoy, config, diasExtra);
  if (dias.length === 0) return 0;
  const hoyLab = dias[0].fecha;
  const ultimoLab = dias[dias.length - 1].fecha;
  const esLaborable = new Set(dias.map((d) => d.fecha));
  const idxDia = new Map(dias.map((d, i) => [d.fecha, i] as const));

  const ots = await prisma.lavOT.findMany({
    where: { estado: { in: ["pendiente", "en_progreso"] } },
    orderBy: [{ fechaAsignada: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    include: {
      items: { select: { descripcion: true, prendaId: true, cantidad: true, procesoIds: true, duracionMin: true } },
    },
  });
  if (ots.length === 0) return 0;
  type OTFull = (typeof ots)[number];

  // Una colocacion es una pieza ubicada en un dia. Una OT normal = una pieza
  // (esNueva=false). Al partir para rellenar un dia vacio, la OT original queda
  // como "cola" (esNueva=false, con menos items) y se agregan cabezas (esNueva=true).
  type Colocacion = { ot: OTFull; items: ItemLite[]; dur: number; fecha: string; esNueva: boolean };
  const colocaciones: Colocacion[] = [];
  const usado = new Map<string, number>();
  const colocadas = new Set<string>();
  const reservar = (fecha: string, min: number) => usado.set(fecha, (usado.get(fecha) ?? 0) + min);
  const colocarEntera = (o: OTFull, fecha: string) => {
    colocaciones.push({ ot: o, items: o.items, dur: o.duracionMin, fecha, esNueva: false });
    colocadas.add(o.id);
    reservar(fecha, o.duracionMin);
  };

  // Orden de partes: una parte no puede colocarse si un hermano anterior sigue sin ubicar.
  const hermanosPorGrupo = new Map<string, { id: string; idx: number }[]>();
  for (const o of ots) {
    if (o.grupoId == null || o.parteIndice == null) continue;
    const arr = hermanosPorGrupo.get(o.grupoId) ?? [];
    arr.push({ id: o.id, idx: o.parteIndice });
    hermanosPorGrupo.set(o.grupoId, arr);
  }
  const anteriorSinColocar = (o: OTFull) => {
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
    colocarEntera(o, f);
  }

  // 2. Pendientes en su orden visual actual (ya viene ordenado por la query).
  const pendientes = ots.filter((o) => o.estado === "pendiente");
  const esUrgenteHoy = (o: OTFull) =>
    o.urgente || (!!o.fechaNecesaria && deadlineInminente(o.fechaNecesaria, dias));

  // 2a. Urgentes / deadline inminente: al frente de hoy (sin importar capacidad).
  for (const o of pendientes.filter(esUrgenteHoy)) colocarEntera(o, hoyLab);

  // 2b. Normales: gap-filling por dia respetando el orden base y el orden de partes.
  const cola = pendientes.filter((o) => !esUrgenteHoy(o));
  for (const d of dias) {
    let restante = d.cap - (usado.get(d.fecha) ?? 0);
    let i = 0;
    while (i < cola.length && restante > 0) {
      if (cola[i].duracionMin <= restante && !anteriorSinColocar(cola[i])) {
        colocarEntera(cola[i], d.fecha);
        restante -= cola[i].duracionMin;
        cola.splice(i, 1);
      } else {
        i++;
      }
    }
  }
  for (const o of cola) colocarEntera(o, ultimoLab); // sobrantes al ultimo dia

  // 2c. Fill inteligente: rellenar dias laborables VACIOS partiendo la OT pendiente
  // mas proxima de un dia posterior. No parte si el fragmento seria muy chico ni si
  // rompe el orden de las partes de un grupo.
  const esPartible = (c: Colocacion) => c.ot.estado === "pendiente" && !esUrgenteHoy(c.ot) && c.dur > 0;
  const siblingsSafe = (c: Colocacion, fechaDestino: string) => {
    if (c.ot.grupoId == null || c.ot.parteIndice == null) return true;
    const dIdx = idxDia.get(fechaDestino) ?? -1;
    // Ninguna parte anterior del grupo puede quedar en un dia posterior al destino.
    return !colocaciones.some(
      (o) =>
        o.ot.grupoId === c.ot.grupoId &&
        o.ot.parteIndice != null &&
        o.ot.parteIndice < c.ot.parteIndice! &&
        (idxDia.get(o.fecha) ?? 1e9) > dIdx
    );
  };

  for (const d of dias) {
    if ((usado.get(d.fecha) ?? 0) > 0 || d.cap <= 0) continue; // solo dias vacios
    let restante = d.cap;
    while (restante >= MIN_FRAGMENTO_MIN) {
      const cand = colocaciones
        .filter((c) => esPartible(c) && (idxDia.get(c.fecha) ?? 1e9) > (idxDia.get(d.fecha) ?? -1) && siblingsSafe(c, d.fecha))
        .sort((a, b) => (idxDia.get(a.fecha) ?? 0) - (idxDia.get(b.fecha) ?? 0))[0];
      if (!cand) break;

      const { head, tail } = partirPorCapacidad(cand.items, restante);
      if (head.dur < MIN_FRAGMENTO_MIN || head.dur > restante) break; // no entra un fragmento util

      reservar(cand.fecha, -head.dur); // el dia origen libera lo que se mueve
      reservar(d.fecha, head.dur);
      restante -= head.dur;

      if (tail.dur <= 0) {
        // Entró entera en el hueco: es un simple movimiento a este dia.
        cand.fecha = d.fecha;
      } else {
        cand.items = tail.items;
        cand.dur = tail.dur;
        colocaciones.push({ ot: cand.ot, items: head.items, dur: head.dur, fecha: d.fecha, esNueva: true });
      }
    }
  }

  // --- Materializar ---
  const piezasPorOt = new Map<string, Colocacion[]>();
  for (const c of colocaciones) {
    const arr = piezasPorOt.get(c.ot.id) ?? [];
    arr.push(c);
    piezasPorOt.set(c.ot.id, arr);
  }

  // Orden dentro de cada dia (por el orden de insercion) y secuencia global.
  const ordenDe = new Map<Colocacion, number>();
  const seqDe = new Map<Colocacion, number>();
  for (const d of dias) {
    const delDia = colocaciones.filter((c) => c.fecha === d.fecha);
    delDia.forEach((c, i) => {
      ordenDe.set(c, i);
      seqDe.set(c, (idxDia.get(d.fecha) ?? 0) * 100000 + i);
    });
  }

  // Grupos afectados por un split (para renumerar sus partes).
  const grupoFinal = new Map<string, string>(); // otId partido -> grupoId final
  const gruposTocados = new Set<string>();
  for (const [otId, ps] of piezasPorOt) {
    if (ps.length <= 1) continue; // no se partio
    const g = ps[0].ot.grupoId ?? crypto.randomUUID();
    grupoFinal.set(otId, g);
    gruposTocados.add(g);
  }
  const grupoDe = (c: Colocacion): string | null => grupoFinal.get(c.ot.id) ?? c.ot.grupoId;

  // Numeracion de partes por grupo tocado (por orden de agenda).
  const parteInfo = new Map<Colocacion, { idx: number; total: number }>();
  const piezasDeGrupo = new Map<string, Colocacion[]>();
  for (const c of colocaciones) {
    const g = grupoDe(c);
    if (g && gruposTocados.has(g)) {
      const arr = piezasDeGrupo.get(g) ?? [];
      arr.push(c);
      piezasDeGrupo.set(g, arr);
    }
  }
  for (const ps of piezasDeGrupo.values()) {
    ps.sort((a, b) => (seqDe.get(a) ?? 0) - (seqDe.get(b) ?? 0));
    ps.forEach((c, i) => parteInfo.set(c, { idx: i + 1, total: ps.length }));
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const datosDe = (o: OTFull) => (o.datosIA === null ? undefined : (o.datosIA as Prisma.InputJsonValue));

  for (const [otId, ps] of piezasPorOt) {
    const o = ps[0].ot;
    if (ps.length > 1) {
      // OT partida: la original queda como "cola" (esNueva=false) y las cabezas se crean.
      const g = grupoFinal.get(otId)!;
      const original = ps.find((c) => !c.esNueva)!;
      const cabezas = ps.filter((c) => c.esNueva);
      const piOrig = parteInfo.get(original)!;
      ops.push(
        prisma.lavOT.update({
          where: { id: otId },
          data: {
            fechaAsignada: original.fecha,
            orden: ordenDe.get(original)!,
            duracionMin: original.dur,
            grupoId: g,
            parteIndice: piOrig.idx,
            parteTotal: piOrig.total,
            items: { deleteMany: {}, create: original.items.map((it) => ({ descripcion: it.descripcion, prendaId: it.prendaId, cantidad: it.cantidad, procesoIds: it.procesoIds, duracionMin: it.duracionMin })) },
          },
        })
      );
      for (const c of cabezas) {
        const pi = parteInfo.get(c)!;
        ops.push(
          prisma.lavOT.create({
            data: {
              numero: o.numero,
              nombreCliente: o.nombreCliente,
              telefono: o.telefono,
              domicilio: o.domicilio,
              fechaTicket: o.fechaTicket,
              estado: "pendiente",
              fechaAsignada: c.fecha,
              orden: ordenDe.get(c)!,
              duracionMin: c.dur,
              aRevisar: o.aRevisar,
              urgente: o.urgente,
              fechaNecesaria: o.fechaNecesaria,
              grupoId: g,
              parteIndice: pi.idx,
              parteTotal: pi.total,
              empleadoCargaId: o.empleadoCargaId,
              datosIA: datosDe(o),
              createdAt: o.createdAt,
              items: { create: c.items.map((it) => ({ descripcion: it.descripcion, prendaId: it.prendaId, cantidad: it.cantidad, procesoIds: it.procesoIds, duracionMin: it.duracionMin })) },
            },
          })
        );
      }
    } else {
      // OT entera: solo se actualiza posicion (y numeracion si su grupo fue tocado).
      const c = ps[0];
      const data: Prisma.LavOTUpdateInput = {};
      if (o.fechaAsignada !== c.fecha) data.fechaAsignada = c.fecha;
      if (o.orden !== ordenDe.get(c)!) data.orden = ordenDe.get(c)!;
      const g = o.grupoId;
      if (g && gruposTocados.has(g)) {
        const pi = parteInfo.get(c)!;
        if (o.parteIndice !== pi.idx) data.parteIndice = pi.idx;
        if (o.parteTotal !== pi.total) data.parteTotal = pi.total;
      }
      if (Object.keys(data).length > 0) ops.push(prisma.lavOT.update({ where: { id: otId }, data }));
    }
  }

  if (ops.length === 0) return 0;
  await prisma.$transaction(ops);
  return ops.length;
}
