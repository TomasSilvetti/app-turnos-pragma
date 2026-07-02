import { prisma } from "@/lib/prisma";
import { etiquetaDia } from "./fecha";
import { primerDiaLaborable } from "./capacidad";
import type { OTSnap } from "./tablero";
import { cargaTaller, historicoAlCerrar, registrarEvento } from "./historico";

// Una OT terminada pendiente de entrega. Extiende el snapshot del tablero con la
// fecha (yyyy-MM-dd, en AR) en que se terminó, para agrupar y buscar por día.
export type TerminadoSnap = OTSnap & {
  fecha: string;
  dia: string;
  fechaCorta: string;
};

const TZ = "America/Argentina/Buenos_Aires";

// yyyy-MM-dd (en AR) de un timestamp. Sirve para agrupar/etiquetar por día.
function fechaAR(fecha: Date | null): string {
  if (!fecha) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

type OTConItems = {
  id: string;
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  estado: string;
  duracionMin: number;
  aRevisar: boolean;
  fechaNecesaria: string | null;
  terminadoEn: Date | null;
  grupoId: string | null;
  parteIndice: number | null;
  parteTotal: number | null;
  empleadoTrabajo: { nombre: string } | null;
  items: { descripcion: string; cantidad: number; prendaId: string | null; procesoIds: string[]; duracionMin: number }[];
};

// Devuelve las OTs terminadas y aún no entregadas. Las OTs divididas (grupoId)
// se muestran como una única card combinada, pero SOLO cuando todas sus partes
// están terminadas (si alguna sigue en la cola, la OT no aparece acá todavía).
export async function getTerminados(): Promise<TerminadoSnap[]> {
  const procesos = await prisma.lavProceso.findMany({ select: { id: true, nombre: true } });
  const nombreProceso = new Map(procesos.map((p) => [p.id, p.nombre]));

  const include = {
    items: { select: { descripcion: true, cantidad: true, prendaId: true, procesoIds: true, duracionMin: true } },
    empleadoTrabajo: { select: { nombre: true } },
  } as const;

  const ots = (await prisma.lavOT.findMany({
    where: { estado: "terminado", entregadoEn: null },
    orderBy: { terminadoEn: "desc" },
    include,
  })) as unknown as OTConItems[];

  const mapItems = (its: OTConItems["items"]) =>
    its.map((it) => ({
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      prendaId: it.prendaId,
      procesoIds: it.procesoIds,
      procesos: it.procesoIds.map((id) => nombreProceso.get(id) ?? "").filter(Boolean),
      duracionMin: it.duracionMin,
    }));

  const conFecha = (ot: OTSnap, terminadoEn: Date | null): TerminadoSnap => {
    const fecha = fechaAR(terminadoEn);
    const { dia, fechaCorta } = fecha ? etiquetaDia(fecha) : { dia: "", fechaCorta: "" };
    return { ...ot, fecha, dia, fechaCorta };
  };

  const base = (ot: OTConItems): OTSnap => ({
    id: ot.id,
    numero: ot.numero,
    nombreCliente: ot.nombreCliente,
    telefono: ot.telefono,
    domicilio: ot.domicilio,
    estado: "terminado",
    duracionMin: ot.duracionMin,
    orden: 0,
    aRevisar: ot.aRevisar,
    urgente: false,
    urgentePorDeadline: false,
    fechaNecesaria: ot.fechaNecesaria,
    empezadoEn: null,
    terminadoEn: ot.terminadoEn?.toISOString() ?? null,
    empleadoTrabajo: ot.empleadoTrabajo?.nombre ?? null,
    items: mapItems(ot.items),
    puedeEmpezar: false,
    grupoId: ot.grupoId,
    parteIndice: ot.parteIndice,
    parteTotal: ot.parteTotal,
    partesCompletadas: null,
  });

  const sueltas = ots.filter((o) => !o.grupoId);
  const grupoIds = [...new Set(ots.filter((o) => o.grupoId).map((o) => o.grupoId!))];

  const salida: TerminadoSnap[] = sueltas.map((ot) => conFecha(base(ot), ot.terminadoEn));

  if (grupoIds.length > 0) {
    // Traemos TODAS las partes de cada grupo (aunque estén en otro estado) para
    // saber si el grupo está completo. Sólo se combina si todas están terminadas
    // y ninguna fue entregada aún.
    const partes = (await prisma.lavOT.findMany({
      where: { grupoId: { in: grupoIds } },
      include,
    })) as unknown as (OTConItems & { entregadoEn: Date | null })[];

    const porGrupo = new Map<string, typeof partes>();
    for (const p of partes) {
      const arr = porGrupo.get(p.grupoId!) ?? [];
      arr.push(p);
      porGrupo.set(p.grupoId!, arr);
    }

    for (const [gid, ps] of porGrupo) {
      const completo = ps.every((p) => p.estado === "terminado" && p.entregadoEn === null);
      if (!completo) continue;

      // Fusiona items por prenda + procesos (reconstruye la OT original).
      const merge = new Map<string, OTSnap["items"][number]>();
      for (const p of ps) {
        for (const it of mapItems(p.items)) {
          const key = `${it.prendaId ?? ""}|${[...it.procesoIds].sort().join(",")}|${it.descripcion}`;
          const prev = merge.get(key);
          if (prev) {
            prev.cantidad += it.cantidad;
            prev.duracionMin += it.duracionMin;
          } else {
            merge.set(key, { ...it });
          }
        }
      }

      const ref = ps[0];
      const ultima = ps.reduce((a, b) =>
        (b.terminadoEn?.getTime() ?? 0) > (a.terminadoEn?.getTime() ?? 0) ? b : a
      );
      const combinada: OTSnap = {
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
        terminadoEn: ultima.terminadoEn?.toISOString() ?? null,
        empleadoTrabajo: ultima.empleadoTrabajo?.nombre ?? null,
        items: [...merge.values()],
        puedeEmpezar: false,
        grupoId: gid,
        parteIndice: null,
        parteTotal: ps.length,
        partesCompletadas: ps.length,
      };
      salida.push(conFecha(combinada, ultima.terminadoEn));
    }
  }

  // Más recientes primero.
  salida.sort((a, b) => (b.terminadoEn ?? "").localeCompare(a.terminadoEn ?? ""));
  return salida;
}

// Marca como entregada una OT terminada. Si el id es de una card combinada
// ("grupo-<gid>") entrega todas las partes del grupo. Devuelve cuántas OTs se
// marcaron (0 si no había ninguna terminada para entregar).
export async function marcarEntregada(id: string): Promise<number> {
  const ahora = new Date();
  const where = id.startsWith("grupo-")
    ? { grupoId: id.slice("grupo-".length), estado: "terminado", entregadoEn: null }
    : { id, estado: "terminado", entregadoEn: null };

  // Se capturan los ids afectados ANTES de actualizar, para cerrar su histórico.
  const afectadas = await prisma.lavOT.findMany({ where, select: { id: true, numero: true, grupoId: true } });
  if (afectadas.length === 0) return 0;

  const res = await prisma.lavOT.updateMany({ where, data: { entregadoEn: ahora } });

  // Histórico: registra la entrega y actualiza el lead time hasta entrega.
  for (const ot of afectadas) {
    await historicoAlCerrar(ot.id);
    const backlog = await cargaTaller(ot.id);
    await registrarEvento({
      otId: ot.id,
      tipo: "entregada",
      numero: ot.numero,
      grupoId: ot.grupoId,
      backlogCount: backlog.count,
      backlogMin: backlog.min,
    });
  }

  return res.count;
}

// Devuelve una OT terminada por error al tablero como "en progreso". La reubica
// en el día laborable de hoy (al final de la cola) y limpia terminadoEn,
// conservando quién la empezó. Si el id es de una card combinada ("grupo-<gid>")
// vuelven todas sus partes. Devuelve cuántas OTs se reabrieron.
export async function volverAlTablero(id: string): Promise<number> {
  const where = id.startsWith("grupo-")
    ? { grupoId: id.slice("grupo-".length), estado: "terminado", entregadoEn: null }
    : { id, estado: "terminado", entregadoEn: null };

  const afectadas = await prisma.lavOT.findMany({
    where,
    select: { id: true, numero: true, grupoId: true, duracionMin: true },
  });
  if (afectadas.length === 0) return 0;

  const target = await primerDiaLaborable();
  const ultima = await prisma.lavOT.findFirst({
    where: { fechaAsignada: target },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  const base = (ultima?.orden ?? -1) + 1;

  await prisma.$transaction(
    afectadas.map((ot, i) =>
      prisma.lavOT.update({
        where: { id: ot.id },
        data: { estado: "en_progreso", terminadoEn: null, fechaAsignada: target, orden: base + i },
      })
    )
  );

  // Histórico: dejamos rastro de la reapertura (no cerramos labels: la OT sigue viva).
  for (const ot of afectadas) {
    const backlog = await cargaTaller(ot.id);
    await registrarEvento({
      otId: ot.id,
      tipo: "reabierta",
      numero: ot.numero,
      grupoId: ot.grupoId,
      duracionMin: ot.duracionMin,
      fechaAsignada: target,
      backlogCount: backlog.count,
      backlogMin: backlog.min,
    });
  }

  return afectadas.length;
}
