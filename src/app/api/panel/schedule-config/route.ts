import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function generateSlotsForMonth(
  year: number,
  month: number, // 0-indexed
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  daysOfWeek: number[]
): { date: string; time: string }[] {
  const startTotal = parseTimeToMinutes(startTime);
  const endTotal = parseTimeToMinutes(endTime);
  const daysSet = new Set(daysOfWeek);
  const slots: { date: string; time: string }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (!daysSet.has(date.getDay())) continue;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    for (let t = startTotal; t < endTotal; t += intervalMinutes) {
      const h = Math.floor(t / 60).toString().padStart(2, "0");
      const m = (t % 60).toString().padStart(2, "0");
      slots.push({ date: dateStr, time: `${h}:${m}` });
    }
  }
  return slots;
}

function validateBody(body: Record<string, unknown>): { error: string; field?: string } | null {
  const { startTime, endTime, intervalMinutes, daysOfWeek, serviceTypeIds } = body;

  if (!startTime || typeof startTime !== "string")
    return { error: "El campo 'startTime' es obligatorio", field: "startTime" };
  if (!endTime || typeof endTime !== "string")
    return { error: "El campo 'endTime' es obligatorio", field: "endTime" };
  if (intervalMinutes === undefined || intervalMinutes === null)
    return { error: "El campo 'intervalMinutes' es obligatorio", field: "intervalMinutes" };

  const intervalNum = Number(intervalMinutes);
  if (!Number.isInteger(intervalNum) || intervalNum <= 0)
    return { error: "'intervalMinutes' debe ser un entero positivo", field: "intervalMinutes" };

  const [startH, startM] = (startTime as string).split(":").map(Number);
  const [endH, endM] = (endTime as string).split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM))
    return { error: "Formato de hora inválido, use HH:MM", field: "startTime" };

  if (parseTimeToMinutes(endTime as string) <= parseTimeToMinutes(startTime as string))
    return { error: "'endTime' debe ser posterior a 'startTime'", field: "endTime" };

  if (!Array.isArray(daysOfWeek) || (daysOfWeek as unknown[]).length === 0)
    return { error: "Debe seleccionar al menos un día", field: "daysOfWeek" };

  if (!Array.isArray(serviceTypeIds) || (serviceTypeIds as unknown[]).length === 0)
    return { error: "Debe seleccionar al menos un tipo de servicio", field: "serviceTypeIds" };

  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) return NextResponse.json(validationError, { status: 422 });

  const { name, startTime, endTime, intervalMinutes, daysOfWeek, serviceTypeIds } = body as {
    name: string;
    startTime: string;
    endTime: string;
    intervalMinutes: number;
    daysOfWeek: number[];
    serviceTypeIds: string[];
  };

  const serviceProviderId = session.user.id;

  const businessProfile = await prisma.businessProfile.findFirst({
    where: {
      OR: [
        { serviceProviderId },
        { empleados: { some: { serviceProviderId } } },
      ],
    },
    select: { id: true },
  });
  if (!businessProfile)
    return NextResponse.json({ error: "El prestador no tiene perfil de negocio" }, { status: 404 });

  const ownedServiceTypes = await prisma.serviceType.findMany({
    where: { id: { in: serviceTypeIds }, businessProfileId: businessProfile.id },
    select: { id: true },
  });
  if (ownedServiceTypes.length !== serviceTypeIds.length) {
    return NextResponse.json(
      { error: "Algunos tipos de servicio no pertenecen al negocio", field: "serviceTypeIds" },
      { status: 422 }
    );
  }

  const activeConfigs = await prisma.scheduleConfig.findMany({
    where: { businessProfileId: businessProfile.id, isActive: true },
    select: { id: true, startTime: true, endTime: true, daysOfWeek: true },
  });

  const newStart = parseTimeToMinutes(startTime);
  const newEnd = parseTimeToMinutes(endTime);
  const newDays = new Set(daysOfWeek as number[]);

  const overlapping = activeConfigs.find((cfg) => {
    const sharedDay = (cfg.daysOfWeek as number[]).some((d) => newDays.has(d));
    if (!sharedDay) return false;
    const cfgStart = parseTimeToMinutes(cfg.startTime);
    const cfgEnd = parseTimeToMinutes(cfg.endTime);
    return newStart < cfgEnd && cfgStart < newEnd;
  });

  if (overlapping)
    return NextResponse.json(
      { error: "El horario se superpone con una configuración activa existente en los mismos días", field: "startTime" },
      { status: 409 }
    );

  const config = await prisma.scheduleConfig.create({
    data: {
      name: name ?? `${startTime} - ${endTime}`,
      startTime,
      endTime,
      intervalMinutes: Number(intervalMinutes),
      daysOfWeek: daysOfWeek as number[],
      price: 0,
      businessProfileId: businessProfile.id,
      serviceTypes: { connect: serviceTypeIds.map((id) => ({ id })) },
    },
  });

  const configWithTypes = await prisma.scheduleConfig.findUnique({
    where: { id: config.id },
    include: { serviceTypes: { select: { id: true, title: true } } },
  });

  return NextResponse.json(
    {
      id: config.id,
      startTime: config.startTime,
      endTime: config.endTime,
      intervalMinutes: config.intervalMinutes,
      daysOfWeek: config.daysOfWeek,
      serviceTypes: configWithTypes?.serviceTypes ?? [],
      affectedBookings: 0,
    },
    { status: 201 }
  );
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) return NextResponse.json(validationError, { status: 422 });

  const { startTime, endTime, intervalMinutes, daysOfWeek, serviceTypeIds } = body as {
    startTime: string;
    endTime: string;
    intervalMinutes: number;
    daysOfWeek: number[];
    serviceTypeIds: string[];
  };

  const serviceProviderId = session.user.id;

  const businessProfile = await prisma.businessProfile.findFirst({
    where: {
      OR: [
        { serviceProviderId },
        { empleados: { some: { serviceProviderId } } },
      ],
    },
    select: { id: true },
  });
  if (!businessProfile)
    return NextResponse.json({ error: "El prestador no tiene perfil de negocio" }, { status: 404 });

  const ownedServiceTypes = await prisma.serviceType.findMany({
    where: { id: { in: serviceTypeIds }, businessProfileId: businessProfile.id },
    select: { id: true },
  });
  if (ownedServiceTypes.length !== serviceTypeIds.length) {
    return NextResponse.json(
      { error: "Algunos tipos de servicio no pertenecen al negocio", field: "serviceTypeIds" },
      { status: 422 }
    );
  }

  const existingConfig = await prisma.scheduleConfig.findFirst({
    where: { businessProfileId: businessProfile.id },
    select: { id: true },
  });
  if (!existingConfig)
    return NextResponse.json({ error: "No existe configuración de horarios para actualizar" }, { status: 404 });

  // Fetch all existing appointments with their bookings
  const allAppointments = await prisma.appointment.findMany({
    where: { scheduleConfigId: existingConfig.id },
    select: {
      id: true,
      date: true,
      time: true,
      booking: { select: { id: true, status: true } },
    },
  });

  // Build new slot sets per month based on new config
  const monthsSet = new Set(allAppointments.map((a) => a.date.substring(0, 7)));
  const newSlotsByMonth = new Map<string, Set<string>>();
  for (const monthStr of monthsSet) {
    const [yearStr, monthIndexStr] = monthStr.split("-");
    const year = Number(yearStr);
    const month = Number(monthIndexStr) - 1;
    const slots = generateSlotsForMonth(
      year,
      month,
      startTime,
      endTime,
      Number(intervalMinutes),
      daysOfWeek as number[]
    );
    newSlotsByMonth.set(monthStr, new Set(slots.map((s) => `${s.date}|${s.time}`)));
  }

  // Categorize existing appointments
  const toDelete: string[] = [];
  const toReschedulePending: string[] = [];
  const toRescheduleConfirmed: string[] = [];
  const existingSlotKeys = new Set<string>();

  for (const appt of allAppointments) {
    const monthStr = appt.date.substring(0, 7);
    const slotKey = `${appt.date}|${appt.time}`;
    const isInNewSlots = newSlotsByMonth.get(monthStr)?.has(slotKey) ?? false;
    const hasActiveBooking =
      appt.booking !== null &&
      appt.booking.status !== "cancelled" &&
      appt.booking.status !== "requires_reschedule";

    if (!isInNewSlots) {
      if (hasActiveBooking) {
        if (appt.booking!.status === "pending") {
          toReschedulePending.push(appt.booking!.id);
        } else {
          toRescheduleConfirmed.push(appt.booking!.id);
        }
        // Keep the appointment — it has an active booking
      } else {
        toDelete.push(appt.id);
      }
    } else {
      existingSlotKeys.add(slotKey);
    }
  }

  // New slots to create (only those not already covered by an existing appointment)
  const newAppointmentsToCreate: { date: string; time: string }[] = [];
  for (const slotSet of newSlotsByMonth.values()) {
    for (const slotKey of slotSet) {
      if (!existingSlotKeys.has(slotKey)) {
        const [date, time] = slotKey.split("|");
        newAppointmentsToCreate.push({ date, time });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.appointment.deleteMany({ where: { id: { in: toDelete } } });
    }
    if (toReschedulePending.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: toReschedulePending } },
        data: { status: "requires_reschedule", previousStatus: "pending" },
      });
    }
    if (toRescheduleConfirmed.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: toRescheduleConfirmed } },
        data: { status: "requires_reschedule", previousStatus: "confirmed" },
      });
    }
    if (newAppointmentsToCreate.length > 0) {
      await tx.appointment.createMany({
        data: newAppointmentsToCreate.map((slot) => ({
          date: slot.date,
          time: slot.time,
          scheduleConfigId: existingConfig.id,
          serviceProviderId,
        })),
      });
    }
    await tx.scheduleConfig.update({
      where: { id: existingConfig.id },
      data: {
        startTime,
        endTime,
        intervalMinutes: Number(intervalMinutes),
        daysOfWeek: daysOfWeek as number[],
        serviceTypes: { set: serviceTypeIds.map((id) => ({ id })) },
      },
    });
  });

  const updatedConfig = await prisma.scheduleConfig.findUnique({
    where: { id: existingConfig.id },
    include: { serviceTypes: { select: { id: true, title: true } } },
  });

  return NextResponse.json(
    {
      id: updatedConfig!.id,
      startTime: updatedConfig!.startTime,
      endTime: updatedConfig!.endTime,
      intervalMinutes: updatedConfig!.intervalMinutes,
      daysOfWeek: updatedConfig!.daysOfWeek,
      serviceTypes: updatedConfig!.serviceTypes,
      affectedBookings: toReschedulePending.length + toRescheduleConfirmed.length,
    },
    { status: 200 }
  );
}
