import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

// POST /api/public/[slug]/bookings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  const { date, startTime, serviceTypeId, clientName, clientPhone } = body;

  // Validar campos requeridos
  if (!date || !startTime || !serviceTypeId || !clientName || !clientPhone) {
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

  // Obtener el perfil del empleado por slug
  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      serviceProviderId: true,
      serviceProvider: { select: { modoTurno: true } },
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Empleado no encontrado" },
      { status: 404 }
    );
  }

  if (profile.serviceProvider.modoTurno !== "POR_TIPO") {
    return NextResponse.json(
      { error: "Este empleado no usa el modo de turno por tipo" },
      { status: 400 }
    );
  }

  // Obtener el tipo de turno para calcular endTime en el servidor
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

  // Obtener horario de atención para ese día
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const scheduleConfig = await prisma.scheduleConfig.findFirst({
    where: {
      serviceProviderId: profile.serviceProviderId,
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
    },
    select: { endTime: true },
  });

  if (!scheduleConfig) {
    return NextResponse.json(
      { error: "No hay horario de atención configurado para este día" },
      { status: 404 }
    );
  }

  const scheduleEndMin = timeToMinutes(scheduleConfig.endTime);
  if (endMin > scheduleEndMin) {
    return NextResponse.json(
      { error: "El turno finaliza fuera del horario de atención" },
      { status: 409 }
    );
  }

  // Obtener turnos activos del día para verificar solapamiento
  // Usamos una transacción con select for update implícito vía Prisma para mitigar race conditions
  const result = await prisma.$transaction(async (tx) => {
    const existingAppointments = await tx.appointment.findMany({
      where: {
        serviceProviderId: profile.serviceProviderId,
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

    // Crear el Appointment
    const appointment = await tx.appointment.create({
      data: {
        time: startTime,
        date,
        serviceProviderId: profile.serviceProviderId,
        serviceTypeId,
        isActive: true,
      },
    });

    // Crear el Booking asociado
    const booking = await tx.booking.create({
      data: {
        appointmentId: appointment.id,
        clientName,
        clientPhone,
        status: "pending",
      },
    });

    return { appointment, booking };
  });

  if ("conflict" in result) {
    return NextResponse.json(
      { error: "El horario seleccionado se superpone con un turno ya reservado" },
      { status: 409 }
    );
  }

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
