import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpleado, requireAdmin } from "@/lib/lavanderia/empleado";
import { calcularDuracion, type ItemEntrada } from "@/lib/lavanderia/duraciones";
import { asignarOT, primerDiaLaborable, recompactar } from "@/lib/lavanderia/capacidad";
import { cargaTaller, historicoAlCerrar, registrarEvento } from "@/lib/lavanderia/historico";

// PATCH: acciones sobre una OT.
//  - { accion: "empezar" }  empleado: la marca en progreso y la manda al frente
//    de la columna de hoy, debajo del ultimo trabajo ya empezado.
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

    // Cualquier OT pendiente puede empezarse (varias en simultaneo). Al empezarla,
    // se manda a la columna de hoy y se reordena: los trabajos ya empezados quedan
    // arriba en orden de inicio (el recien empezado, ultimo del grupo); los
    // pendientes quedan debajo conservando su orden.
    const target = await primerDiaLaborable();
    const actualizada = await prisma.$transaction(async (tx) => {
      const upd = await tx.lavOT.update({
        where: { id },
        data: { estado: "en_progreso", empezadoEn: new Date(), empleadoTrabajoId: empleado.id, fechaAsignada: target },
        select: { id: true, estado: true },
      });

      const delDia = await tx.lavOT.findMany({
        where: { fechaAsignada: target },
        select: { id: true, estado: true, empezadoEn: true, orden: true },
      });
      const yaEmpezado = (e: string) => e === "en_progreso" || e === "terminado";
      const empezados = delDia
        .filter((o) => yaEmpezado(o.estado))
        .sort((a, b) => (a.empezadoEn?.getTime() ?? 0) - (b.empezadoEn?.getTime() ?? 0) || a.orden - b.orden);
      const pendientes = delDia.filter((o) => !yaEmpezado(o.estado)).sort((a, b) => a.orden - b.orden);

      const ordenadas = [...empezados, ...pendientes];
      await Promise.all(
        ordenadas
          .map((o, i) => ({ o, i }))
          .filter(({ o, i }) => o.orden !== i)
          .map(({ o, i }) => tx.lavOT.update({ where: { id: o.id }, data: { orden: i } }))
      );
      return upd;
    });
    const backlog = await cargaTaller(id);
    await registrarEvento({
      otId: id,
      tipo: "empezada",
      numero: ot.numero,
      grupoId: ot.grupoId,
      empleadoId: empleado.id,
      duracionMin: ot.duracionMin,
      fechaAsignada: target,
      backlogCount: backlog.count,
      backlogMin: backlog.min,
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
    // Histórico: completa los labels (lead time real, error de estimación).
    await historicoAlCerrar(id);
    const backlog = await cargaTaller(id);
    await registrarEvento({
      otId: id,
      tipo: "terminada",
      numero: ot.numero,
      grupoId: ot.grupoId,
      empleadoId: empleado.id,
      duracionMin: ot.duracionMin,
      fechaAsignada: ot.fechaAsignada,
      backlogCount: backlog.count,
      backlogMin: backlog.min,
    });
    return NextResponse.json({ ot: actualizada });
  }

  if (accion === "editar") {
    const itemsEntrada: ItemEntrada[] = Array.isArray(body.items)
      ? body.items
          .filter((i: unknown) => i && typeof (i as ItemEntrada).descripcion === "string")
          .map((i: ItemEntrada) => ({
            prendaId: i.prendaId ?? null,
            descripcion: i.descripcion,
            cantidad: Number(i.cantidad) || 1,
            procesoIds: Array.isArray(i.procesoIds) ? i.procesoIds.filter((x): x is string => typeof x === "string") : [],
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
          fechaTicket: typeof body.fechaTicket === "string" ? body.fechaTicket : null,
          duracionMin: calculo.duracionTotal,
          aRevisar: calculo.aRevisar,
          urgente,
          fechaNecesaria,
          fechaAsignada,
          orden,
          items: {
            create: calculo.items.map((it) => ({
              descripcion: it.descripcion,
              prendaId: it.prendaId,
              cantidad: it.cantidad,
              procesoIds: it.procesoIds,
              duracionMin: it.duracionMin,
            })),
          },
        },
      }),
    ]);

    // La edicion pudo cambiar duracion/prioridad: recompactar la cola (gap-filling).
    await recompactar();

    // Histórico: la edición no re-congela el ingreso, pero queda en el log con la
    // nueva composición para poder reconstruir el cambio.
    await registrarEvento({
      otId: id,
      tipo: "editada",
      numero: typeof body.numero === "string" ? body.numero : ot.numero,
      grupoId: ot.grupoId,
      empleadoId: empleado.id,
      duracionMin: calculo.duracionTotal,
      fechaAsignada,
      orden,
      payload: {
        items: calculo.items.map((it) => ({
          descripcion: it.descripcion,
          prendaId: it.prendaId,
          cantidad: it.cantidad,
          procesoIds: it.procesoIds,
          duracionMin: it.duracionMin,
        })),
        aRevisar: calculo.aRevisar,
        urgente,
        fechaNecesaria,
      },
    });

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
    await registrarEvento({
      otId: id,
      tipo: "movida",
      numero: ot.numero,
      grupoId: ot.grupoId,
      empleadoId: admin.id,
      duracionMin: ot.duracionMin,
      fechaAsignada,
      orden,
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
