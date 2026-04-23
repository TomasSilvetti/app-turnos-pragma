import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";

export async function GET(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceProviderId = request.nextUrl.searchParams.get("serviceProviderId");
  if (!serviceProviderId)
    return NextResponse.json({ error: "El parámetro 'serviceProviderId' es obligatorio" }, { status: 400 });

  const entrada = await prisma.listaEspera.findUnique({
    where: {
      clienteId_serviceProviderId: {
        clienteId: session.clienteId,
        serviceProviderId,
      },
    },
    include: { disponibilidades: true },
  });

  if (!entrada || entrada.estado !== "activa") {
    return NextResponse.json({ yaEnLista: false }, { status: 200 });
  }

  return NextResponse.json({
    yaEnLista: true,
    cualquierVacante: entrada.cualquierVacante,
    disponibilidades: entrada.disponibilidades.map((d) => ({
      diaSemana: d.diaSemana,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
    })),
  }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceProviderId = request.nextUrl.searchParams.get("serviceProviderId");
  if (!serviceProviderId)
    return NextResponse.json({ error: "El parámetro 'serviceProviderId' es obligatorio" }, { status: 400 });

  const entrada = await prisma.listaEspera.findUnique({
    where: {
      clienteId_serviceProviderId: {
        clienteId: session.clienteId,
        serviceProviderId,
      },
    },
    select: { id: true, estado: true },
  });

  if (!entrada || entrada.estado !== "activa")
    return NextResponse.json({ error: "No estás en la lista de espera de este profesional" }, { status: 404 });

  await prisma.listaEspera.delete({ where: { id: entrada.id } });

  return NextResponse.json({ success: true }, { status: 200 });
}

type DisponibilidadInput = {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};

export async function POST(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: {
    serviceProviderId?: string;
    bookingIdRespaldo?: string | null;
    cualquierVacante?: boolean;
    disponibilidades?: DisponibilidadInput[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { serviceProviderId, bookingIdRespaldo, cualquierVacante, disponibilidades } = body;

  if (!serviceProviderId)
    return NextResponse.json({ error: "El campo 'serviceProviderId' es obligatorio" }, { status: 400 });

  // Verificar que el profesional existe
  const profesional = await prisma.serviceProvider.findUnique({
    where: { id: serviceProviderId },
    select: { id: true },
  });
  if (!profesional)
    return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });

  // Verificar que el cliente tiene un booking activo con este profesional (respaldo obligatorio)
  if (bookingIdRespaldo) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingIdRespaldo,
        clienteId: session.clienteId,
        status: { in: ["pending", "confirmed"] },
        appointment: { serviceProviderId },
      },
      select: { id: true },
    });
    if (!booking)
      return NextResponse.json({ error: "El booking de respaldo no es válido o no pertenece al cliente" }, { status: 400 });
  } else {
    const tieneRespaldo = await prisma.booking.findFirst({
      where: {
        clienteId: session.clienteId,
        status: { in: ["pending", "confirmed"] },
        appointment: { serviceProviderId },
      },
      select: { id: true },
    });
    if (!tieneRespaldo)
      return NextResponse.json({ error: "Necesitás tener un turno reservado con este profesional para unirte a la lista" }, { status: 400 });
  }

  // Validar disponibilidades si se configuran
  if (!cualquierVacante && disponibilidades && disponibilidades.length > 0) {
    for (const d of disponibilidades) {
      if (typeof d.diaSemana !== "number" || d.diaSemana < 0 || d.diaSemana > 6)
        return NextResponse.json({ error: "diaSemana debe ser un número entre 0 y 6" }, { status: 400 });
      if (!d.horaInicio || !d.horaFin)
        return NextResponse.json({ error: "horaInicio y horaFin son obligatorios" }, { status: 400 });
    }
  }

  // Obtener posición al final de la lista activa del profesional
  const ultimaPosicion = await prisma.listaEspera.aggregate({
    where: {
      serviceProviderId,
      estado: { in: ["activa", "notificada"] },
    },
    _max: { posicion: true },
  });

  const nuevaPosicion = (ultimaPosicion._max.posicion ?? 0) + 1;

  // Upsert en transacción (si ya estaba en lista, actualiza)
  const entrada = await prisma.$transaction(async (tx) => {
    const existing = await tx.listaEspera.findUnique({
      where: {
        clienteId_serviceProviderId: {
          clienteId: session.clienteId,
          serviceProviderId,
        },
      },
    });

    if (existing) {
      // Actualizar entrada existente
      await tx.disponibilidadListaEspera.deleteMany({ where: { listaEsperaId: existing.id } });
      const updated = await tx.listaEspera.update({
        where: { id: existing.id },
        data: {
          estado: "activa",
          bookingIdRespaldo: bookingIdRespaldo ?? null,
          cualquierVacante: cualquierVacante ?? true,
          posicion: existing.estado === "activa" ? existing.posicion : nuevaPosicion,
          disponibilidades: disponibilidades && disponibilidades.length > 0
            ? { create: disponibilidades.map((d) => ({ diaSemana: d.diaSemana, horaInicio: d.horaInicio, horaFin: d.horaFin })) }
            : undefined,
        },
      });
      return updated;
    }

    return tx.listaEspera.create({
      data: {
        clienteId: session.clienteId,
        serviceProviderId,
        posicion: nuevaPosicion,
        bookingIdRespaldo: bookingIdRespaldo ?? null,
        cualquierVacante: cualquierVacante ?? true,
        disponibilidades: disponibilidades && disponibilidades.length > 0
          ? { create: disponibilidades.map((d) => ({ diaSemana: d.diaSemana, horaInicio: d.horaInicio, horaFin: d.horaFin })) }
          : undefined,
      },
    });
  });

  return NextResponse.json({ success: true, posicion: entrada.posicion }, { status: 201 });
}
