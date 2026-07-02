import { NextRequest, NextResponse } from "next/server";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { getTerminados, marcarEntregada } from "@/lib/lavanderia/terminados";

// GET: OTs terminadas pendientes de entrega (con las divididas ya recombinadas).
export async function GET(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ots = await getTerminados();
  return NextResponse.json({ ots });
}

// PATCH: { id } marca la OT (o el grupo "grupo-<id>") como entregada.
export async function PATCH(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Falta el id de la OT" }, { status: 400 });

  const count = await marcarEntregada(id);
  if (count === 0)
    return NextResponse.json({ error: "La OT ya fue entregada o no está terminada" }, { status: 409 });

  return NextResponse.json({ ok: true, entregadas: count });
}
