import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recombinarTodas } from "@/lib/lavanderia/recombinar";

// POST: vuelve a unir todas las sub-OTs pendientes que quedaron troceadas (backfill). Admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const resultado = await recombinarTodas();
  return NextResponse.json({ ok: true, ...resultado });
}
