import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// PUT: habilita/deshabilita el turno extra (14-17) para un día puntual. Solo admin.
// body: { fecha: "yyyy-MM-dd", habilitado: boolean }
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const fecha = typeof body.fecha === "string" ? body.fecha : "";
  const habilitado = Boolean(body.habilitado);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

  await prisma.lavDiaExtra.upsert({
    where: { fecha },
    update: { habilitado },
    create: { fecha, habilitado },
  });
  return NextResponse.json({ fecha, habilitado });
}
