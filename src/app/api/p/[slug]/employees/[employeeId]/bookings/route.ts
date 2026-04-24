import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";
import { emitNewBooking } from "@/lib/booking-emitter";
import { BookingStatus } from "@prisma/client";


function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hasOverlap(
  newStartMin: number,
  newEndMin: number,
  appointments: { time: string; duracion: number }[]
): boolean {
  return appointments.some((appt) => {
    const aStart = timeToMinutes(appt.time);
    const aEnd = aStart + appt.duracion;
    return newStartMin < aEnd && newEndMin > aStart;
  });
}

// POST /api/p/[slug]/employees/[employeeId]/bookings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; employeeId: string }> }
) {
  const { slug, employeeId } = await params;

  const clientSession = await getClientSession(request);

  let body: {
    date?: string;
    startTime?: string;
    serviceTypeId?: string;
    clientName?: string;
    clientPhone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { date, startTime, serviceTypeId, clientName, clientPhone: rawClientPhone } = body;
  let clientPhone = rawClientPhone ?? "";

  if (!date || !startTime || !serviceTypeId || !clientName || !rawClientPhone) {
    return NextResponse.json(
      {
        error:
          "Los campos 'date', 'startTime', 'serviceTypeId', 'clientName' y 'clientPhone' son requeridos",
      },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "El campo 'date' debe estar en formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json(
      { error: "El campo 'startTime' debe estar en formato HH:MM" },
      { status: 400 }
    );
  }

  // Verificar negocio
  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { id: true, serviceProviderId: true, empleados: { select: { serviceProviderId: true } } },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // Verificar empleado y modoTurno
  const employee = await prisma.serviceProvider.findUnique({
    where: { id: employeeId },
    select: { modoTurno: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  if (employee.modoTurno !== "POR_TIPO") {
    return NextResponse.json(
      { error: "Este empleado no usa el modo de turno por tipo" },
      { status: 400 }
    );
  }

  // Obtener tipo de turno (el servidor calcula endTime, no confía en el frontend)
  const serviceType = await prisma.serviceType.findUnique({
    where: { id: serviceTypeId },
    select: { duracion: true, title: true },
  });

  if (!serviceType || serviceType.duracion == null) {
    return NextResponse.json(
      { error: "Tipo de turno no encontrado o sin duración configurada" },
      { status: 400 }
    );
  }

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + serviceType.duracion;
  const endTime = minutesToTime(endMin);

  // Verificar horario de atención para ese día
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = (new Date(year, month - 1, day).getDay() + 6) % 7;

  const scheduleConfigs = await prisma.scheduleConfig.findMany({
    where: {
      businessProfileId: profile.id,
      serviceProviderId: employeeId,
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
    },
    select: { startTime: true, endTime: true },
  });

  if (scheduleConfigs.length === 0) {
    return NextResponse.json(
      { error: "No hay horario de atención configurado para este día" },
      { status: 404 }
    );
  }

  const fitsInAnyConfig = scheduleConfigs.some((config) => {
    const configStartMin = timeToMinutes(config.startTime);
    const configEndMin = timeToMinutes(config.endTime);
    return startMin >= configStartMin && endMin <= configEndMin;
  });

  if (!fitsInAnyConfig) {
    return NextResponse.json(
      { error: "El turno finaliza fuera del horario de atención" },
      { status: 409 }
    );
  }

  // Resolver teléfono real si el cliente está autenticado
  if (clientSession && (!clientPhone || !clientPhone.startsWith("+"))) {
    const clienteData = await prisma.cliente.findUnique({
      where: { id: clientSession.clienteId },
      select: { telefono: true },
    });
    clientPhone = clienteData?.telefono ?? clientPhone;
  }

  // Transacción: verificar solapamiento y crear appointment + booking
  const result = await prisma.$transaction(async (tx) => {
    const existingAppointments = await tx.appointment.findMany({
      where: {
        serviceProviderId: employeeId,
        date,
        isActive: true,
      },
      select: {
        time: true,
        serviceType: { select: { duracion: true } },
      },
    });

    const mapped = existingAppointments.map((a) => ({
      time: a.time,
      duracion: a.serviceType?.duracion ?? 0,
    }));

    if (hasOverlap(startMin, endMin, mapped)) {
      return { conflict: "overlap" as const };
    }

    const businessServiceProviderIds = [
      profile.serviceProviderId,
      ...profile.empleados.map((e) => e.serviceProviderId),
    ];
    const duplicateDayWhere = clientSession
      ? { clienteId: clientSession.clienteId, status: { in: ["pending", "confirmed"] as BookingStatus[] }, appointment: { date, serviceProviderId: { in: businessServiceProviderIds } } }
      : { clientPhone, status: { in: ["pending", "confirmed"] as BookingStatus[] }, appointment: { date, serviceProviderId: { in: businessServiceProviderIds } } };

    const existingOnDate = await tx.booking.findFirst({ where: duplicateDayWhere });
    if (existingOnDate) {
      return { conflict: "duplicate_day" as const };
    }

    const appointment = await tx.appointment.create({
      data: {
        time: startTime,
        date,
        serviceProviderId: employeeId,
        serviceTypeId,
        isActive: true,
      },
    });

    const booking = await tx.booking.create({
      data: {
        appointmentId: appointment.id,
        clientName,
        clientPhone,
        clienteId: clientSession?.clienteId ?? null,
        status: "pending",
      },
    });

    return { appointment, booking };
  });

  if ("conflict" in result) {
    const message =
      result.conflict === "duplicate_day"
        ? "Ya tenés un turno reservado para ese día"
        : "El horario seleccionado se superpone con un turno ya reservado";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  emitNewBooking();

  return NextResponse.json(
    {
      appointmentId: result.appointment.id,
      bookingId: result.booking.id,
      date,
      startTime,
      endTime,
      serviceType: serviceType.title,
    },
    { status: 201 }
  );
}
