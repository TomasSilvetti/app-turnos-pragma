import { prisma } from "@/lib/prisma";

export type ItemEntrada = {
  prendaId?: string | null;
  descripcion: string;
  cantidad: number;
};

export type ItemCalculado = {
  prendaId: string | null;
  descripcion: string;
  cantidad: number;
  procesos: string[];
  duracionMin: number;
  monto: number;
};

export type CalculoDuracion = {
  items: ItemCalculado[];
  duracionTotal: number;
  montoTotal: number;
  aRevisar: boolean; // algun item no se pudo mapear a una prenda de la matriz
};

// Suma de minutos de todos los procesos configurados para cada prenda, y el
// total de la OT (por cantidad). Items sin prenda reconocida quedan en 0 y
// marcan la OT como "a revisar".
export async function calcularDuracion(items: ItemEntrada[]): Promise<CalculoDuracion> {
  const prendaIds = items.map((i) => i.prendaId).filter((x): x is string => Boolean(x));

  const duraciones = prendaIds.length
    ? await prisma.lavDuracion.findMany({
        where: { prendaId: { in: prendaIds } },
        include: { proceso: { select: { nombre: true, orden: true } } },
      })
    : [];

  // prendaId -> { minutos total, precio total, procesos ordenados }
  const porPrenda = new Map<string, { minutos: number; precio: number; procesos: string[] }>();
  for (const d of duraciones) {
    const entry = porPrenda.get(d.prendaId) ?? { minutos: 0, precio: 0, procesos: [] };
    entry.minutos += d.minutos;
    entry.precio += d.precio;
    entry.procesos.push(d.proceso.nombre);
    porPrenda.set(d.prendaId, entry);
  }

  let aRevisar = false;
  const calculados: ItemCalculado[] = items.map((i) => {
    const cantidad = Math.max(1, Math.round(i.cantidad || 1));
    const info = i.prendaId ? porPrenda.get(i.prendaId) : undefined;
    if (!i.prendaId || !info) aRevisar = true;
    const unit = info?.minutos ?? 0;
    const precioUnit = info?.precio ?? 0;
    return {
      prendaId: i.prendaId ?? null,
      descripcion: i.descripcion,
      cantidad,
      procesos: info?.procesos ?? [],
      duracionMin: unit * cantidad,
      monto: precioUnit * cantidad,
    };
  });

  const duracionTotal = calculados.reduce((acc, i) => acc + i.duracionMin, 0);
  const montoTotal = calculados.reduce((acc, i) => acc + i.monto, 0);
  return { items: calculados, duracionTotal, montoTotal, aRevisar };
}

// Reaplica la matriz actual a las OTs todavía en el tablero (no terminadas),
// recalculando duración/procesos/monto de sus items. Se corre cuando cambian los
// tiempos de la matriz; al tocar las filas de LavOT el tablero (SSE) se actualiza
// solo. Si se pasan prendaIds, solo recalcula las OTs que usan esas prendas; sin
// argumento recalcula todas las activas (p. ej. al borrar un proceso). Las OTs
// terminadas no se tocan: su tiempo/monto quedó fijado como histórico.
export async function recalcularOTsActivas(prendaIds?: string[]): Promise<number> {
  const ots = await prisma.lavOT.findMany({
    where: {
      estado: { not: "terminado" },
      ...(prendaIds && prendaIds.length > 0
        ? { items: { some: { prendaId: { in: prendaIds } } } }
        : {}),
    },
    include: {
      items: { select: { id: true, prendaId: true, descripcion: true, cantidad: true } },
    },
  });
  if (ots.length === 0) return 0;

  const updates = [];
  for (const ot of ots) {
    const calculo = await calcularDuracion(
      ot.items.map((it) => ({ prendaId: it.prendaId, descripcion: it.descripcion, cantidad: it.cantidad }))
    );
    // calcularDuracion preserva el orden de los items de entrada.
    ot.items.forEach((it, i) => {
      const c = calculo.items[i];
      updates.push(
        prisma.lavOTItem.update({
          where: { id: it.id },
          data: { duracionMin: c.duracionMin, monto: c.monto, procesos: c.procesos },
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
