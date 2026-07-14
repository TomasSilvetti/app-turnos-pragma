import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recompactar } from "@/lib/lavanderia/capacidad";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/; // yyyy-MM-dd

// GET: lista de feriados futuros/de hoy en adelante, ordenados por fecha. Solo admin.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const feriados = await prisma.lavDiaFeriado.findMany({ orderBy: { fecha: "asc" } });
  return NextResponse.json({ feriados });
}

// POST: marca una fecha como feriado. Reflow (recompactar) para que las OTs de ese
// dia se corran al siguiente dia habil. Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const fecha = typeof body.fecha === "string" ? body.fecha : "";
  const motivo = typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim() : null;
  if (!FECHA_REGEX.test(fecha))
    return NextResponse.json({ error: "Fecha inválida (usá formato yyyy-MM-dd)" }, { status: 400 });

  const feriado = await prisma.lavDiaFeriado.upsert({
    where: { fecha },
    update: { motivo },
    create: { fecha, motivo },
  });
  await recompactar();
  return NextResponse.json({ feriado });
}

// DELETE: quita un feriado (?fecha=yyyy-MM-dd). Reflow para volver a llenar ese dia. Solo admin.
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const fecha = request.nextUrl.searchParams.get("fecha") ?? "";
  if (!FECHA_REGEX.test(fecha))
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

  await prisma.lavDiaFeriado.deleteMany({ where: { fecha } });
  await recompactar();
  return NextResponse.json({ ok: true });
}
