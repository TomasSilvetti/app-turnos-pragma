import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recompactar } from "@/lib/lavanderia/capacidad";

// POST: corre el fill (recompactar) a demanda. En prod lo dispara el cron-minuto de
// Inngest; esto sirve para forzarlo manualmente (dev/testing o un "reacomodar" admin).
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const ops = await recompactar();
  return NextResponse.json({ ok: true, ops });
}
