import { prisma } from "@/lib/prisma";

// "Valet x kilo" va a una máquina especial: la carga completa se procesa junta,
// así que la duración es la que tiene cargada en la matriz (Valet × sus procesos)
// pero NO escala con la cantidad de kilos.
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const esPrendaValet = (nombre: string | null | undefined) =>
  typeof nombre === "string" && normalizar(nombre).includes("valet");

export type ItemEntrada = {
  prendaId?: string | null;
  descripcion: string;
  cantidad: number;
  procesoIds?: string[];
};

export type ItemCalculado = {
  prendaId: string | null;
  descripcion: string;
  cantidad: number;
  procesoIds: string[];
  procesos: string[]; // nombres de los procesos aplicados (para mostrar)
  duracionMin: number;
  sinTiempos: boolean; // tiene prenda y procesos, pero la matriz no les cargó minutos
};

export type CalculoDuracion = {
  items: ItemCalculado[];
  duracionTotal: number;
  aRevisar: boolean; // algún item no se pudo mapear a la matriz o no tiene tiempos cargados
};

// Calcula la duración de cada item directo de la matriz prenda × proceso:
//  - duración = Σ minutos[prenda][proceso] de los procesos aplicados × cantidad
// Items sin prenda, sin procesos o sin minutos cargados quedan en 0 y marcan la
// OT como "a revisar".
export async function calcularDuracion(items: ItemEntrada[]): Promise<CalculoDuracion> {
  const prendaIds = [...new Set(items.map((i) => i.prendaId).filter((x): x is string => Boolean(x)))];
  const procesoIds = [...new Set(items.flatMap((i) => i.procesoIds ?? []))];

  const [tiempos, procesos, prendas] = await Promise.all([
    prendaIds.length
      ? prisma.lavDuracion.findMany({ where: { prendaId: { in: prendaIds } }, select: { prendaId: true, procesoId: true, minutos: true } })
      : Promise.resolve([]),
    procesoIds.length
      ? prisma.lavProceso.findMany({ where: { id: { in: procesoIds } }, select: { id: true, nombre: true } })
      : Promise.resolve([]),
    prendaIds.length
      ? prisma.lavPrenda.findMany({ where: { id: { in: prendaIds } }, select: { id: true, nombre: true } })
      : Promise.resolve([]),
  ]);

  // (prendaId, procesoId) -> minutos
  const minutosCelda = new Map<string, number>();
  for (const t of tiempos) minutosCelda.set(`${t.prendaId}:${t.procesoId}`, t.minutos);
  const nombreProceso = new Map(procesos.map((p) => [p.id, p.nombre]));
  const valetIds = new Set(prendas.filter((p) => esPrendaValet(p.nombre)).map((p) => p.id));

  let aRevisar = false;
  const calculados: ItemCalculado[] = items.map((i) => {
    const cantidad = Math.max(1, Math.round(i.cantidad || 1));
    const ids = (i.procesoIds ?? []).filter((id) => nombreProceso.has(id));

    let minutosUnit = 0;
    if (i.prendaId) {
      for (const procesoId of ids) {
        minutosUnit += minutosCelda.get(`${i.prendaId}:${procesoId}`) ?? 0;
      }
    }

    // "Sin tiempos": la prenda existe y se le aplicaron procesos, pero la matriz
    // no tiene minutos cargados para esa combinación (suma 0).
    const sinTiempos = Boolean(i.prendaId) && ids.length > 0 && minutosUnit === 0;
    if (!i.prendaId || ids.length === 0 || sinTiempos) aRevisar = true;

    // Valet x kilo: máquina especial, la duración de la matriz es por carga
    // completa y NO se multiplica por la cantidad de kilos.
    const esValet = Boolean(i.prendaId) && valetIds.has(i.prendaId!);
    const duracionMin = esValet ? minutosUnit : minutosUnit * cantidad;

    return {
      prendaId: i.prendaId ?? null,
      descripcion: i.descripcion,
      cantidad,
      procesoIds: ids,
      procesos: ids.map((id) => nombreProceso.get(id) ?? "").filter(Boolean),
      duracionMin,
      sinTiempos,
    };
  });

  const duracionTotal = calculados.reduce((acc, i) => acc + i.duracionMin, 0);
  return { items: calculados, duracionTotal, aRevisar };
}

// Reaplica la matriz actual a las OTs todavía en el tablero (no terminadas),
// recalculando duración/procesos de sus items. Se corre cuando cambian los
// tiempos de la matriz; al tocar las filas de LavOT el tablero (SSE) se
// actualiza solo. Las OTs terminadas no se tocan (histórico).
export async function recalcularOTsActivas(prendaIds?: string[]): Promise<number> {
  const ots = await prisma.lavOT.findMany({
    where: {
      estado: { not: "terminado" },
      ...(prendaIds && prendaIds.length > 0 ? { items: { some: { prendaId: { in: prendaIds } } } } : {}),
    },
    include: {
      items: { select: { id: true, prendaId: true, descripcion: true, cantidad: true, procesoIds: true } },
    },
  });
  if (ots.length === 0) return 0;

  const updates = [];
  for (const ot of ots) {
    const calculo = await calcularDuracion(
      ot.items.map((it) => ({ prendaId: it.prendaId, descripcion: it.descripcion, cantidad: it.cantidad, procesoIds: it.procesoIds }))
    );
    // calcularDuracion preserva el orden de los items de entrada.
    ot.items.forEach((it, i) => {
      const c = calculo.items[i];
      updates.push(
        prisma.lavOTItem.update({
          where: { id: it.id },
          data: { duracionMin: c.duracionMin, procesoIds: c.procesoIds },
        })
      );
    });
    updates.push(
      prisma.lavOT.update({
        where: { id: ot.id },
        data: { duracionMin: calculo.duracionTotal, aRevisar: calculo.aRevisar },
      })
    );
  }
  await prisma.$transaction(updates);
  return ots.length;
}
