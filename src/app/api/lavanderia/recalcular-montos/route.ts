import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recalcularOTsActivas } from "@/lib/lavanderia/duraciones";

// POST: recalcula la duración de todas las OTs activas con la matriz actual
// (tiempos/servicios). Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const actualizados = await recalcularOTsActivas();
  return NextResponse.json({ ok: true, actualizados });
}
