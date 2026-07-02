import { NextRequest, NextResponse } from "next/server";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { getTerminados, marcarEntregada, volverAlTablero } from "@/lib/lavanderia/terminados";

// GET: OTs terminadas pendientes de entrega (con las divididas ya recombinadas).
export async function GET(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ots = await getTerminados();
  return NextResponse.json({ ots });
}

// PATCH: { id } marca la OT (o el grupo "grupo-<id>") como entregada.
//        { id, accion: "volver" } la devuelve al tablero (en progreso), para
//        deshacer un "terminar" hecho por error.
export async function PATCH(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Falta el id de la OT" }, { status: 400 });

  if (body.accion === "volver") {
    const count = await volverAlTablero(id);
    if (count === 0)
      return NextResponse.json({ error: "La OT ya fue entregada o no está terminada" }, { status: 409 });
    return NextResponse.json({ ok: true, reabiertas: count });
  }

  const count = await marcarEntregada(id);
  if (count === 0)
    return NextResponse.json({ error: "La OT ya fue entregada o no está terminada" }, { status: 409 });

  return NextResponse.json({ ok: true, entregadas: count });
}
