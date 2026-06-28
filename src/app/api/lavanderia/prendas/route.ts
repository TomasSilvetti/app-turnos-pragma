import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// GET: lista de prendas. Publico (alimenta el selector de correccion del preview).
export async function GET() {
  const prendas = await prisma.lavPrenda.findMany({
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true, incompleta: true },
  });
  return NextResponse.json({ prendas });
}

// POST: crea una prenda (fila de la matriz). Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const max = await prisma.lavPrenda.aggregate({ _max: { orden: true } });
  const prenda = await prisma.lavPrenda.create({
    data: { nombre, orden: (max._max.orden ?? -1) + 1 },
    select: { id: true, nombre: true },
  });
  return NextResponse.json({ prenda }, { status: 201 });
}
