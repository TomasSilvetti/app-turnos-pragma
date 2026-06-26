import { NextRequest, NextResponse } from "next/server";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { calcularDuracion, type ItemEntrada } from "@/lib/lavanderia/duraciones";

// POST: dado un conjunto de items, devuelve duración y monto (de la matriz) por
// item y totales. Lo usa el modal de edición para previsualizar / recalcular.
export async function POST(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const items: ItemEntrada[] = Array.isArray(body.items)
    ? body.items
        .filter((i: unknown) => i && typeof (i as ItemEntrada).descripcion === "string")
        .map((i: ItemEntrada) => ({
          prendaId: i.prendaId ?? null,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad) || 1,
        }))
    : [];

  const calculo = await calcularDuracion(items);
  return NextResponse.json(calculo);
}
