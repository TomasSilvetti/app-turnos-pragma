import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// PUT: reubica/reordena varias OTs en una transacción. Solo admin.
// body: { movimientos: [{ id, fechaAsignada, orden }] }
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const movimientos = Array.isArray(body.movimientos) ? body.movimientos : [];
  const validos = movimientos.filter(
    (m: unknown): m is { id: string; fechaAsignada: string; orden: number } =>
      !!m &&
      typeof (m as { id: unknown }).id === "string" &&
      typeof (m as { fechaAsignada: unknown }).fechaAsignada === "string" &&
      Number.isFinite((m as { orden: unknown }).orden)
  );
  if (validos.length === 0) return NextResponse.json({ error: "Sin movimientos" }, { status: 400 });

  await prisma.$transaction(
    validos.map((m: { id: string; fechaAsignada: string; orden: number }) =>
      prisma.lavOT.update({
        where: { id: m.id },
        data: { fechaAsignada: m.fechaAsignada, orden: Math.round(m.orden) },
      })
    )
  );

  return NextResponse.json({ ok: true, actualizadas: validos.length });
}
