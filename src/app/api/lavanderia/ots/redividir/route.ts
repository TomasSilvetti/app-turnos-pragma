import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { redividirGrandes } from "@/lib/lavanderia/redividir";

// POST: parte las OTs pendientes grandes que quedaron enteras (backfill). Admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const resultado = await redividirGrandes();
  return NextResponse.json({ ok: true, ...resultado });
}
