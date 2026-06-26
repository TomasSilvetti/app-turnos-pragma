import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { recalcularOTsActivas } from "@/lib/lavanderia/duraciones";

// PUT: edita el precio de una celda prenda x servicio (matriz Precios). Solo admin.
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const prendaId = typeof body.prendaId === "string" ? body.prendaId : "";
  const servicioId = typeof body.servicioId === "string" ? body.servicioId : "";
  if (!prendaId || !servicioId)
    return NextResponse.json({ error: "prendaId y servicioId requeridos" }, { status: 400 });

  const precio = Number.isFinite(body.precio) ? Math.max(0, Math.round(body.precio)) : 0;
  if (precio <= 0) {
    await prisma.lavPrecio.deleteMany({ where: { prendaId, servicioId } });
  } else {
    await prisma.lavPrecio.upsert({
      where: { prendaId_servicioId: { prendaId, servicioId } },
      update: { precio },
      create: { prendaId, servicioId, precio },
    });
  }

  await recalcularOTsActivas([prendaId]);

  return NextResponse.json({ prendaId, servicioId, precio });
}
