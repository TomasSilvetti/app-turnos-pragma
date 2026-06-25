import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// GET: lista de empleados activos (publico, alimenta el selector del navbar).
// Con ?todos=1 y sesion admin, incluye inactivos y el campo `activo` (gestion).
export async function GET(request: NextRequest) {
  const todos = request.nextUrl.searchParams.get("todos") === "1";
  if (todos) {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const empleados = await prisma.lavEmpleado.findMany({
      orderBy: [{ activo: "desc" }, { esAdmin: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, esAdmin: true, activo: true },
    });
    return NextResponse.json({ empleados });
  }

  const empleados = await prisma.lavEmpleado.findMany({
    where: { activo: true },
    orderBy: [{ esAdmin: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, esAdmin: true },
  });
  return NextResponse.json({ empleados });
}

// POST: crea un empleado. Solo admin.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const empleado = await prisma.lavEmpleado.create({
    data: { nombre, esAdmin: Boolean(body.esAdmin) },
    select: { id: true, nombre: true, esAdmin: true, activo: true },
  });
  return NextResponse.json({ empleado }, { status: 201 });
}
