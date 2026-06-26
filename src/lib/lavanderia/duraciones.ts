import { prisma } from "@/lib/prisma";

export type ItemEntrada = {
  prendaId?: string | null;
  descripcion: string;
  cantidad: number;
  servicioIds?: string[];
};

export type ItemCalculado = {
  prendaId: string | null;
  descripcion: string;
  cantidad: number;
  servicioIds: string[];
  servicios: string[]; // nombres de los servicios aplicados (para mostrar)
  duracionMin: number;
  monto: number;
};

export type CalculoDuracion = {
  items: ItemCalculado[];
  duracionTotal: number;
  montoTotal: number;
  aRevisar: boolean; // algun item no se pudo mapear a una prenda de la matriz
};

// Calcula duración y monto de cada item a partir de la prenda y los servicios
// aplicados:
//  - duración = Σ servicios (Σ minutos de sus procesos para esa prenda) × cantidad
//  - monto    = Σ servicios (precio del servicio para esa prenda) × cantidad
// Items sin prenda reconocida quedan en 0 y marcan la OT como "a revisar".
export async function calcularDuracion(items: ItemEntrada[]): Promise<CalculoDuracion> {
  const prendaIds = [...new Set(items.map((i) => i.prendaId).filter((x): x is string => Boolean(x)))];
  const servicioIds = [...new Set(items.flatMap((i) => i.servicioIds ?? []))];

  const [tiempos, servicioProcesos, precios, servicios] = await Promise.all([
    prendaIds.length
      ? prisma.lavDuracion.findMany({ where: { prendaId: { in: prendaIds } }, select: { prendaId: true, procesoId: true, minutos: true } })
      : Promise.resolve([]),
    servicioIds.length
      ? prisma.lavServicioProceso.findMany({ where: { servicioId: { in: servicioIds } }, select: { servicioId: true, procesoId: true } })
      : Promise.resolve([]),
    prendaIds.length && servicioIds.length
      ? prisma.lavPrecio.findMany({ where: { prendaId: { in: prendaIds }, servicioId: { in: servicioIds } }, select: { prendaId: true, servicioId: true, precio: true } })
      : Promise.resolve([]),
    servicioIds.length
      ? prisma.lavServicio.findMany({ where: { id: { in: servicioIds } }, select: { id: true, nombre: true } })
      : Promise.resolve([]),
  ]);

  // (prendaId, procesoId) -> minutos
  const minutosCelda = new Map<string, number>();
  for (const t of tiempos) minutosCelda.set(`${t.prendaId}:${t.procesoId}`, t.minutos);
  // servicioId -> procesoIds
  const procesosDeServicio = new Map<string, string[]>();
  for (const sp of servicioProcesos) {
    const arr = procesosDeServicio.get(sp.servicioId) ?? [];
    arr.push(sp.procesoId);
    procesosDeServicio.set(sp.servicioId, arr);
  }
  // (prendaId, servicioId) -> precio
  const precioCelda = new Map<string, number>();
  for (const p of precios) precioCelda.set(`${p.prendaId}:${p.servicioId}`, p.precio);
  const nombreServicio = new Map(servicios.map((s) => [s.id, s.nombre]));

  let aRevisar = false;
  const calculados: ItemCalculado[] = items.map((i) => {
    const cantidad = Math.max(1, Math.round(i.cantidad || 1));
    const ids = (i.servicioIds ?? []).filter((id) => nombreServicio.has(id));
    if (!i.prendaId) aRevisar = true;

    let minutosUnit = 0;
    let precioUnit = 0;
    for (const servicioId of ids) {
      if (i.prendaId) {
        for (const procesoId of procesosDeServicio.get(servicioId) ?? []) {
          minutosUnit += minutosCelda.get(`${i.prendaId}:${procesoId}`) ?? 0;
        }
        precioUnit += precioCelda.get(`${i.prendaId}:${servicioId}`) ?? 0;
      }
    }

    return {
      prendaId: i.prendaId ?? null,
      descripcion: i.descripcion,
      cantidad,
      servicioIds: ids,
      servicios: ids.map((id) => nombreServicio.get(id) ?? "").filter(Boolean),
      duracionMin: minutosUnit * cantidad,
      monto: precioUnit * cantidad,
    };
  });

  const duracionTotal = calculados.reduce((acc, i) => acc + i.duracionMin, 0);
  const montoTotal = calculados.reduce((acc, i) => acc + i.monto, 0);
  return { items: calculados, duracionTotal, montoTotal, aRevisar };
}

// Reaplica la matriz actual a las OTs todavía en el tablero (no terminadas),
// recalculando duración/servicios/monto de sus items. Se corre cuando cambian
// tiempos/precios/servicios de la matriz; al tocar las filas de LavOT el tablero
// (SSE) se actualiza solo. Las OTs terminadas no se tocan (histórico).
export async function recalcularOTsActivas(prendaIds?: string[]): Promise<number> {
  const ots = await prisma.lavOT.findMany({
    where: {
      estado: { not: "terminado" },
      ...(prendaIds && prendaIds.length > 0 ? { items: { some: { prendaId: { in: prendaIds } } } } : {}),
    },
    include: {
      items: { select: { id: true, prendaId: true, descripcion: true, cantidad: true, servicioIds: true } },
    },
  });
  if (ots.length === 0) return 0;

  const updates = [];
  for (const ot of ots) {
    const calculo = await calcularDuracion(
      ot.items.map((it) => ({ prendaId: it.prendaId, descripcion: it.descripcion, cantidad: it.cantidad, servicioIds: it.servicioIds }))
    );
    // calcularDuracion preserva el orden de los items de entrada.
    ot.items.forEach((it, i) => {
      const c = calculo.items[i];
      updates.push(
        prisma.lavOTItem.update({
          where: { id: it.id },
          data: { duracionMin: c.duracionMin, monto: c.monto, servicioIds: c.servicioIds },
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
