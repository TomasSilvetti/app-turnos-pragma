import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const entry = await prisma.listaEspera.findUnique({
    where: { notificacionToken: token },
    select: {
      id: true,
      estado: true,
      notificacionTokenExp: true,
      vacanteTurnoId: true,
      bookingIdRespaldo: true,
      serviceProvider: { select: { name: true } },
      bookingRespaldo: {
        select: {
          appointment: { select: { date: true, time: true } },
        },
      },
    },
  });

  if (!entry || entry.estado !== "notificada")
    return NextResponse.json({ error: "Token inválido o no activo" }, { status: 410 });

  if (entry.notificacionTokenExp && entry.notificacionTokenExp < new Date())
    return NextResponse.json({ error: "El token expiró" }, { status: 410 });

  if (!entry.vacanteTurnoId)
    return NextResponse.json({ error: "Turno vacante no encontrado" }, { status: 410 });

  const turno = await prisma.appointment.findUnique({
    where: { id: entry.vacanteTurnoId },
    select: {
      date: true,
      time: true,
      serviceType: { select: { title: true } },
      booking: { select: { status: true } },
    },
  });

  if (!turno || (turno.booking?.status === "pending" || turno.booking?.status === "confirmed"))
    return NextResponse.json({ error: "El turno ya no está disponible" }, { status: 410 });

  return NextResponse.json({
    profesional: entry.serviceProvider.name,
    fecha: turno.date,
    hora: turno.time,
    servicio: turno.serviceType?.title ?? null,
    respaldo: entry.bookingRespaldo?.appointment
      ? {
          fecha: entry.bookingRespaldo.appointment.date,
          hora: entry.bookingRespaldo.appointment.time,
        }
      : null,
  });
}
