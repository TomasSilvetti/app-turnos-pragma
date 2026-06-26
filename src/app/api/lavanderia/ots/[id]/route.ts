import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpleado, requireAdmin } from "@/lib/lavanderia/empleado";
import { calcularDuracion, type ItemEntrada } from "@/lib/lavanderia/duraciones";
import { asignarOT } from "@/lib/lavanderia/capacidad";

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

  if (accion === "editar") {
    // precioDetectado/manual: el monto del body pisa al de la matriz cuando viene.
    const itemsEntrada: (ItemEntrada & { montoManual: number | null })[] = Array.isArray(body.items)
      ? body.items
          .filter((i: unknown) => i && typeof (i as ItemEntrada).descripcion === "string")
          .map((i: ItemEntrada & { monto?: number | null }) => ({
            prendaId: i.prendaId ?? null,
            descripcion: i.descripcion,
            cantidad: Number(i.cantidad) || 1,
            montoManual:
              typeof i.monto === "number" && Number.isFinite(i.monto) ? Math.max(0, Math.round(i.monto)) : null,
          }))
      : [];

    if (itemsEntrada.length === 0)
      return NextResponse.json({ error: "La OT no tiene items" }, { status: 400 });

    const urgente = body.urgente === true;
    const fechaNecesaria =
      typeof body.fechaNecesaria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.fechaNecesaria)
        ? body.fechaNecesaria
        : null;

    const calculo = await calcularDuracion(itemsEntrada);
    const itemsConMonto = calculo.items.map((it, idx) => ({
      ...it,
      monto: itemsEntrada[idx]?.montoManual ?? it.monto,
    }));
    const { fechaAsignada, orden } = await asignarOT(calculo.duracionTotal, { urgente, fechaNecesaria }, id);

    await prisma.$transaction([
      prisma.lavOTItem.deleteMany({ where: { otId: id } }),
      prisma.lavOT.update({
        where: { id },
        data: {
          numero: typeof body.numero === "string" ? body.numero : null,
          nombreCliente: typeof body.nombreCliente === "string" ? body.nombreCliente : null,
          telefono: typeof body.telefono === "string" ? body.telefono : null,
          domicilio: typeof body.domicilio === "string" ? body.domicilio : null,
          total: Number.isFinite(body.total) ? body.total : null,
          fechaTicket: typeof body.fechaTicket === "string" ? body.fechaTicket : null,
          duracionMin: calculo.duracionTotal,
          aRevisar: calculo.aRevisar,
          urgente,
          fechaNecesaria,
          fechaAsignada,
          orden,
          items: {
            create: itemsConMonto.map((it) => ({
              descripcion: it.descripcion,
              prendaId: it.prendaId,
              cantidad: it.cantidad,
              procesos: it.procesos,
              duracionMin: it.duracionMin,
              monto: it.monto,
            })),
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
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
