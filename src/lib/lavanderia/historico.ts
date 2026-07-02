import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { diaSemanaDe } from "./fecha";

// Capa de histórico enriquecido de OTs. Objetivo: acumular, de la forma más
// completa posible, todo lo que pasó por el sistema para poder alimentar más
// adelante modelos que predigan "¿para cuándo estará?" al momento del ingreso.
//
// Dos registros complementarios:
//  - LavOTHistorico: una fila por OT con features de ingreso (congeladas) +
//    labels de resultado (lead time real, error de estimación). Listo para armar
//    un dataset de entrenamiento.
//  - LavOTEvento: log append-only de cada transición, fuente de verdad "guarda de
//    más" que permite reconstruir cualquier métrica futura.
//
// Regla de oro: el histórico NUNCA debe romper el flujo principal. Todo va
// envuelto en try/catch; si algo falla, se loguea y la operación de la OT sigue.

const TZ = "America/Argentina/Buenos_Aires";

// { fecha: yyyy-MM-dd, min: minutos desde medianoche } de un timestamp, en AR.
function partesAR(d: Date): { fecha: string; min: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const fecha = `${get("year")}-${get("month")}-${get("day")}`;
  const hh = parseInt(get("hour"), 10) % 24; // "24:00" → 0 en algunos entornos
  const mm = parseInt(get("minute"), 10);
  return { fecha, min: hh * 60 + mm };
}

// Diferencia en minutos redondeados entre dos timestamps (null si falta alguno).
const difMin = (a: Date | null, b: Date | null): number | null =>
  a && b ? Math.round((b.getTime() - a.getTime()) / 60000) : null;

export type EventoTipo =
  | "creada"
  | "empezada"
  | "terminada"
  | "entregada"
  | "editada"
  | "movida";

type ItemDB = {
  descripcion: string;
  prendaId: string | null;
  cantidad: number;
  procesoIds: string[];
  duracionMin: number;
};

type PrendaSnap = {
  prendaId: string | null;
  prendaNombre: string | null;
  descripcion: string;
  cantidad: number;
  procesoIds: string[];
  procesoNombres: string[];
  duracionMin: number;
};

// Resuelve nombres de prendas/procesos y arma el snapshot de composición + totales.
async function componerPrendas(items: ItemDB[]): Promise<{
  prendas: PrendaSnap[];
  totalPrendas: number;
  totalItems: number;
  totalProcesos: number;
}> {
  const [procesos, prendas] = await Promise.all([
    prisma.lavProceso.findMany({ select: { id: true, nombre: true } }),
    prisma.lavPrenda.findMany({ select: { id: true, nombre: true } }),
  ]);
  const nombreProceso = new Map(procesos.map((p) => [p.id, p.nombre]));
  const nombrePrenda = new Map(prendas.map((p) => [p.id, p.nombre]));

  const snap: PrendaSnap[] = items.map((it) => ({
    prendaId: it.prendaId,
    prendaNombre: it.prendaId ? nombrePrenda.get(it.prendaId) ?? null : null,
    descripcion: it.descripcion,
    cantidad: it.cantidad,
    procesoIds: it.procesoIds,
    procesoNombres: it.procesoIds.map((id) => nombreProceso.get(id) ?? "").filter(Boolean),
    duracionMin: it.duracionMin,
  }));

  return {
    prendas: snap,
    totalPrendas: snap.reduce((acc, p) => acc + p.cantidad, 0),
    totalItems: snap.length,
    totalProcesos: snap.reduce((acc, p) => acc + p.procesoIds.length * p.cantidad, 0),
  };
}

// Carga viva del taller: OTs no terminadas y sus minutos proyectados. Es el
// "backlog" que enfrenta una OT (feature de congestión). Se puede excluir una OT
// (la propia) para medir lo que había por delante.
export async function cargaTaller(excluirId?: string): Promise<{ count: number; min: number }> {
  const agg = await prisma.lavOT.aggregate({
    where: { estado: { not: "terminado" }, ...(excluirId ? { id: { not: excluirId } } : {}) },
    _count: { _all: true },
    _sum: { duracionMin: true },
  });
  return { count: agg._count._all, min: agg._sum.duracionMin ?? 0 };
}

// Registra un evento del ciclo de vida (append-only). Best-effort.
export async function registrarEvento(e: {
  otId: string;
  tipo: EventoTipo;
  numero?: string | null;
  grupoId?: string | null;
  empleadoId?: string | null;
  duracionMin?: number | null;
  fechaAsignada?: string | null;
  orden?: number | null;
  backlogCount?: number | null;
  backlogMin?: number | null;
  payload?: unknown;
}): Promise<void> {
  try {
    await prisma.lavOTEvento.create({
      data: {
        otId: e.otId,
        tipo: e.tipo,
        numero: e.numero ?? null,
        grupoId: e.grupoId ?? null,
        empleadoId: e.empleadoId ?? null,
        duracionMin: e.duracionMin ?? null,
        fechaAsignada: e.fechaAsignada ?? null,
        orden: e.orden ?? null,
        backlogCount: e.backlogCount ?? null,
        backlogMin: e.backlogMin ?? null,
        payload:
          e.payload === undefined ? undefined : (e.payload as Prisma.InputJsonValue),
      },
    });
  } catch (err) {
    console.error("[historico] registrarEvento falló", err);
  }
}

// ── Snapshot diario del plan del tablero ─────────────────────────────────────

// Forma mínima que necesita el snapshot (estructuralmente compatible con DiaSnap
// del tablero; se evita importar el tipo para no crear un ciclo de imports).
type OTPlan = {
  id: string;
  numero: string | null;
  grupoId: string | null;
  parteIndice: number | null;
  estado: string;
  urgente: boolean;
  duracionMin: number;
  items: { cantidad: number; procesoIds: string[] }[];
};
type DiaPlan = { fecha: string; capacidadMin: number; ocupacionMin: number; ots: OTPlan[] };

const prendasDe = (o: OTPlan) => o.items.reduce((s, it) => s + it.cantidad, 0);
const procesosDe = (o: OTPlan) => o.items.reduce((s, it) => s + it.procesoIds.length * it.cantidad, 0);

// Congela el plan del tablero una vez por día. Idempotente: si ya se tomó un
// snapshot con esta snapshotFecha, no hace nada (guard por findFirst + unique).
// Best-effort. Se llama desde getTablero (lazy, al primer load del día).
export async function registrarPlanSnapshot(dias: DiaPlan[], snapshotFecha: string): Promise<void> {
  try {
    const yaExiste = await prisma.lavPlanSnapshot.findFirst({
      where: { snapshotFecha },
      select: { id: true },
    });
    if (yaExiste) return;

    const en = new Date();
    const rows: Prisma.LavPlanSnapshotCreateManyInput[] = dias.map((d, offset) => ({
      snapshotEn: en,
      snapshotFecha,
      diaObjetivo: d.fecha,
      offsetDias: offset,
      capacidadMin: d.capacidadMin,
      ocupacionMin: d.ocupacionMin,
      totalOts: d.ots.length,
      totalPrendas: d.ots.reduce((a, o) => a + prendasDe(o), 0),
      totalProcesos: d.ots.reduce((a, o) => a + procesosDe(o), 0),
      ots: d.ots.map((o) => ({
        otId: o.id,
        numero: o.numero,
        grupoId: o.grupoId,
        parteIndice: o.parteIndice,
        estado: o.estado,
        urgente: o.urgente,
        duracionMin: o.duracionMin,
        prendas: prendasDe(o),
        procesos: procesosDe(o),
      })) as unknown as Prisma.InputJsonValue,
    }));

    // skipDuplicates cubre la carrera de dos loads concurrentes el mismo día.
    await prisma.lavPlanSnapshot.createMany({ data: rows, skipDuplicates: true });
  } catch (err) {
    console.error("[historico] registrarPlanSnapshot falló", err);
  }
}

// Crea/inicializa la fila de histórico al ingresar la OT. Congela las features
// "as-of ingreso" (proyección, backlog, día/hora): son las que un modelo usaría
// para predecir al momento de entrada. Idempotente: si ya existe, no re-congela.
export async function historicoAlCrear(otId: string): Promise<void> {
  try {
    const ot = await prisma.lavOT.findUnique({ where: { id: otId }, include: { items: true } });
    if (!ot) return;

    const { fecha, min } = partesAR(ot.createdAt);
    const comp = await componerPrendas(ot.items);
    const backlog = await cargaTaller(otId); // vivas por delante (sin contar esta)

    await prisma.lavOTHistorico.upsert({
      where: { otId },
      update: {}, // ya congelado: no se toca el ingreso
      create: {
        otId,
        numero: ot.numero,
        grupoId: ot.grupoId,
        parteIndice: ot.parteIndice,
        parteTotal: ot.parteTotal,
        nombreCliente: ot.nombreCliente,
        telefono: ot.telefono,
        domicilio: ot.domicilio,
        ingresadoEn: ot.createdAt,
        ingresoFecha: fecha,
        ingresoDiaSemana: diaSemanaDe(fecha),
        ingresoHoraMin: min,
        urgente: ot.urgente,
        fechaNecesaria: ot.fechaNecesaria,
        aRevisar: ot.aRevisar,
        duracionProyectadaMin: ot.duracionMin,
        fechaAsignadaInicial: ot.fechaAsignada,
        totalPrendas: comp.totalPrendas,
        totalItems: comp.totalItems,
        totalProcesos: comp.totalProcesos,
        backlogCount: backlog.count,
        backlogMin: backlog.min,
        empleadoCargaId: ot.empleadoCargaId,
        empleadoTrabajoId: ot.empleadoTrabajoId,
        prendas: comp.prendas as unknown as Prisma.InputJsonValue,
        datosIA: (ot.datosIA ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[historico] historicoAlCrear falló", err);
  }
}

// Completa los labels de resultado al terminar/entregar. Refresca la composición
// final (lo realmente ejecutado, que se aparea con los tiempos reales) y calcula
// lead times + error de estimación. Idempotente; garantiza que la fila exista
// (por si la OT es anterior a esta capa).
export async function historicoAlCerrar(otId: string): Promise<void> {
  try {
    const ot = await prisma.lavOT.findUnique({ where: { id: otId }, include: { items: true } });
    if (!ot) return;

    await historicoAlCrear(otId); // no-op si ya existe

    const comp = await componerPrendas(ot.items);
    const term = ot.terminadoEn ? partesAR(ot.terminadoEn) : null;
    const ejec = difMin(ot.empezadoEn, ot.terminadoEn);

    const snapshot = {
      id: ot.id,
      numero: ot.numero,
      grupoId: ot.grupoId,
      parteIndice: ot.parteIndice,
      parteTotal: ot.parteTotal,
      estado: ot.estado,
      duracionMin: ot.duracionMin,
      fechaAsignada: ot.fechaAsignada,
      urgente: ot.urgente,
      fechaNecesaria: ot.fechaNecesaria,
      aRevisar: ot.aRevisar,
      createdAt: ot.createdAt.toISOString(),
      empezadoEn: ot.empezadoEn?.toISOString() ?? null,
      terminadoEn: ot.terminadoEn?.toISOString() ?? null,
      entregadoEn: ot.entregadoEn?.toISOString() ?? null,
      prendas: comp.prendas,
    };

    await prisma.lavOTHistorico.update({
      where: { otId },
      data: {
        empezadoEn: ot.empezadoEn,
        terminadoEn: ot.terminadoEn,
        entregadoEn: ot.entregadoEn,
        terminadoFecha: term?.fecha ?? null,
        terminadoDiaSemana: term ? diaSemanaDe(term.fecha) : null,
        esperaMin: difMin(ot.createdAt, ot.empezadoEn),
        ejecucionMin: ejec,
        leadTimeMin: difMin(ot.createdAt, ot.terminadoEn),
        leadTimeEntregaMin: difMin(ot.createdAt, ot.entregadoEn),
        errorEstimacionMin: ejec != null ? ejec - ot.duracionMin : null,
        empleadoTrabajoId: ot.empleadoTrabajoId,
        totalPrendas: comp.totalPrendas,
        totalItems: comp.totalItems,
        totalProcesos: comp.totalProcesos,
        prendas: comp.prendas as unknown as Prisma.InputJsonValue,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[historico] historicoAlCerrar falló", err);
  }
}
