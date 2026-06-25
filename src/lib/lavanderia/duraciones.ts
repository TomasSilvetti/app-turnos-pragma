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
        include: { proceso: { select: { nombre: true, orden: true, precio: true } } },
      })
    : [];

  // prendaId -> { minutos total, precio total, procesos ordenados }
  const porPrenda = new Map<string, { minutos: number; precio: number; procesos: string[] }>();
  for (const d of duraciones) {
    const entry = porPrenda.get(d.prendaId) ?? { minutos: 0, precio: 0, procesos: [] };
    entry.minutos += d.minutos;
    entry.precio += d.proceso.precio;
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
