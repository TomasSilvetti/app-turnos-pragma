import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpleado, requireAdmin } from "@/lib/lavanderia/empleado";

// PATCH: acciones sobre una OT.
//  - { accion: "empezar" }  empleado: la marca en progreso (respeta el orden).
//  - { accion: "terminar" } empleado: la marca terminada.
//  - { accion: "mover", fechaAsignada, orden } admin: reubica en el tablero.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const accion = body.accion;

  const ot = await prisma.lavOT.findUnique({ where: { id } });
  if (!ot) return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });

  if (accion === "empezar") {
    if (ot.estado !== "pendiente")
      return NextResponse.json({ error: "La OT ya fue iniciada" }, { status: 409 });
    // Debe respetar el orden: no puede haber una OT pendiente anterior en el mismo dia.
    const anteriorPendiente = await prisma.lavOT.findFirst({
      where: { fechaAsignada: ot.fechaAsignada, estado: "pendiente", orden: { lt: ot.orden } },
      select: { id: true },
    });
    if (anteriorPendiente)
      return NextResponse.json({ error: "Hay un trabajo anterior sin empezar" }, { status: 409 });

    const actualizada = await prisma.lavOT.update({
      where: { id },
      data: { estado: "en_progreso", empezadoEn: new Date(), empleadoTrabajoId: empleado.id },
      select: { id: true, estado: true },
    });
    return NextResponse.json({ ot: actualizada });
  }

  if (accion === "terminar") {
    if (ot.estado !== "en_progreso")
      return NextResponse.json({ error: "La OT no está en progreso" }, { status: 409 });
    const actualizada = await prisma.lavOT.update({
      where: { id },
      data: { estado: "terminado", terminadoEn: new Date() },
      select: { id: true, estado: true },
    });
    return NextResponse.json({ ot: actualizada });
  }

  if (accion === "mover") {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Solo admin puede mover" }, { status: 403 });
    const fechaAsignada = typeof body.fechaAsignada === "string" ? body.fechaAsignada : ot.fechaAsignada;
    const orden = Number.isFinite(body.orden) ? Math.round(body.orden) : ot.orden;
    const actualizada = await prisma.lavOT.update({
      where: { id },
      data: { fechaAsignada, orden },
      select: { id: true, fechaAsignada: true, orden: true },
    });
    return NextResponse.json({ ot: actualizada });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  await prisma.lavOT.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
