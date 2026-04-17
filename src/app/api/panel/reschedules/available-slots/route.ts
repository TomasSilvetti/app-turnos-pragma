import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function generateSlotsForConfig(
  year: number,
  month: number, // 0-indexed
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  daysOfWeek: number[],
  scheduleConfigId: string,
  serviceProviderId: string,
  skipBefore: Date
): { date: string; time: string; scheduleConfigId: string; serviceProviderId: string; isActive: boolean }[] {
  if (intervalMinutes <= 0) return [];

  const startTotal = parseTimeToMinutes(startTime);
  const endTotal = parseTimeToMinutes(endTime);
  const daysSet = new Set(daysOfWeek);
  const slots: { date: string; time: string; scheduleConfigId: string; serviceProviderId: string; isActive: boolean }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date < skipBefore) continue;
    const isoDay = (date.getDay() + 6) % 7; // 0=Mon … 6=Sun
    if (!daysSet.has(isoDay)) continue;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    for (let t = startTotal; t < endTotal; t += intervalMinutes) {
      const h = Math.floor(t / 60).toString().padStart(2, "0");
      const m = (t % 60).toString().padStart(2, "0");
      slots.push({ date: dateStr, time: `${h}:${m}`, scheduleConfigId, serviceProviderId, isActive: true });
    }
  }
  return slots;
}

/**
 * Regenerates free appointments for the given month from active schedule configs,
 * mirroring the logic of the public /api/p/[slug]/availability endpoint.
 */
async function ensureAppointmentsForMonth(
  serviceProviderId: string,
  year: number,
  monthIndex: number, // 0-indexed
  month: string       // "YYYY-MM"
): Promise<boolean> {
  // Resolve the businessProfile for this provider (owner or employee)
  const businessProfile = await prisma.businessProfile.findFirst({
    where: {
      OR: [
        { serviceProviderId },
        { empleados: { some: { serviceProviderId } } },
      ],
    },
    select: { id: true },
  });

  if (!businessProfile) return false;

  const configs = await prisma.scheduleConfig.findMany({
    where: { businessProfileId: businessProfile.id, isActive: true, serviceProviderId },
    select: { id: true, startTime: true, endTime: true, intervalMinutes: true, daysOfWeek: true },
  });

  console.log(`[available-slots] businessProfileId=${businessProfile.id}, configs found=${configs.length}`);

  if (configs.length === 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Remove stale free appointments for this provider in this month that belong to
  // configs not associated with them (can happen when configs were previously mis-assigned).
  await prisma.appointment.deleteMany({
    where: {
      serviceProviderId,
      date: { startsWith: month },
      scheduleConfig: {
        serviceProviderId: { not: serviceProviderId },
      },
      OR: [
        { booking: { is: null } },
        { booking: { status: "cancelled" } },
      ],
    },
  });

  for (const config of configs) {
    // Delete unbooked appointments for this config/month so they stay in sync.
    // Preserve appointments with requires_reschedule bookings — they must remain
    // until the admin reschedules them manually.
    await prisma.appointment.deleteMany({
      where: {
        scheduleConfigId: config.id,
        date: { startsWith: month },
        OR: [
          { booking: { is: null } },
          { booking: { status: "cancelled" } },
        ],
      },
    });

    // Fetch times already occupied by active bookings so we don't create duplicate slots
    const occupied = await prisma.appointment.findMany({
      where: { scheduleConfigId: config.id, date: { startsWith: month } },
      select: { date: true, time: true },
    });
    const occupiedKeys = new Set(occupied.map((a) => `${a.date}|${a.time}`));

    const slots = generateSlotsForConfig(
      year,
      monthIndex,
      config.startTime,
      config.endTime,
      config.intervalMinutes,
      config.daysOfWeek,
      config.id,
      serviceProviderId,
      today
    ).filter((s) => !occupiedKeys.has(`${s.date}|${s.time}`));

    console.log(`[available-slots] config=${config.id}, occupiedKeys=${occupiedKeys.size}, generatedSlots=${slots.length}`);

    if (slots.length > 0) {
      await prisma.appointment.createMany({ data: slots });
    }
  }
  return true;
}

/**
 * GET /api/panel/reschedules/available-slots
 *
 * Query params (one required):
 *   ?month=YYYY-MM   → regenerates appointments and returns dates with free slots
 *   ?date=YYYY-MM-DD → returns free appointment IDs/times for that date
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sessionProviderId = session.user.id;
  const month = request.nextUrl.searchParams.get("month");
  const date = request.nextUrl.searchParams.get("date");
  const employeeIdParam = request.nextUrl.searchParams.get("employeeId");
  const serviceTypeIdParam = request.nextUrl.searchParams.get("serviceTypeId");

  // Si se pasa employeeId, validar que pertenezca al negocio del admin autenticado
  let serviceProviderId = sessionProviderId;
  if (employeeIdParam) {
    const businessProfile = await prisma.businessProfile.findUnique({
      where: { serviceProviderId: sessionProviderId },
      select: { id: true },
    });
    if (businessProfile) {
      const membership = await prisma.empleadoEmpresa.findFirst({
        where: { serviceProviderId: employeeIdParam, businessProfileId: businessProfile.id },
        select: { serviceProviderId: true },
      });
      if (membership) serviceProviderId = membership.serviceProviderId;
    }
  }

  // --- POR_TIPO branch ---
  const provider = await prisma.serviceProvider.findUnique({
    where: { id: serviceProviderId },
    select: { modoTurno: true },
  });

  if (provider?.modoTurno === "POR_TIPO") {
    const bp = await prisma.businessProfile.findFirst({
      where: {
        OR: [
          { serviceProviderId },
          { empleados: { some: { serviceProviderId } } },
        ],
      },
      select: { id: true },
    });
    if (!bp) return NextResponse.json({ dates: [], noConfigs: true });

    const configs = await prisma.scheduleConfig.findMany({
      where: { businessProfileId: bp.id, isActive: true },
      select: { startTime: true, endTime: true, intervalMinutes: true, daysOfWeek: true },
    });
    if (configs.length === 0) return NextResponse.json({ dates: [], noConfigs: true });

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month))
        return NextResponse.json({ error: "Formato de mes inválido (esperado YYYY-MM)" }, { status: 400 });

      const [yearStr, monthStr] = month.split("-");
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const availableDates: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, monthIndex, day);
        if (d < today) continue;
        const isoDay = (d.getDay() + 6) % 7; // Mon=0..Sun=6
        const covered = configs.some((c) => c.daysOfWeek.includes(isoDay) && c.intervalMinutes > 0);
        if (covered) {
          availableDates.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
        }
      }
      return NextResponse.json({ dates: availableDates });
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        return NextResponse.json({ error: "Formato de fecha inválido (esperado YYYY-MM-DD)" }, { status: 400 });

      const [yr, mo, dy] = date.split("-").map(Number);
      const isoDay = (new Date(yr, mo - 1, dy).getDay() + 6) % 7; // Mon=0..Sun=6
      const config = configs.find((c) => c.daysOfWeek.includes(isoDay) && c.intervalMinutes > 0);
      if (!config) return NextResponse.json({ appointments: [] });

      // Obtener duración del tipo de turno si se proveyó
      let duracion = config.intervalMinutes;
      if (serviceTypeIdParam) {
        const st = await prisma.serviceType.findUnique({
          where: { id: serviceTypeIdParam },
          select: { duracion: true },
        });
        if (st?.duracion) duracion = st.duracion;
      }

      // Turnos activos que ocupan tiempo (excluye requires_reschedule para no bloquearse a sí mismo)
      const existingAppts = await prisma.appointment.findMany({
        where: {
          serviceProviderId,
          date,
          isActive: true,
          booking: { status: { in: ["pending", "confirmed"] } },
        },
        select: { time: true, serviceType: { select: { duracion: true } } },
      });

      const occupied = existingAppts.map((a) => ({
        time: a.time,
        duracion: a.serviceType?.duracion ?? duracion,
      }));

      const startTotal = parseTimeToMinutes(config.startTime);
      const endTotal = parseTimeToMinutes(config.endTime);
      const slots: { id: string; time: string }[] = [];

      for (let t = startTotal; t + duracion <= endTotal; t += config.intervalMinutes) {
        const h = Math.floor(t / 60).toString().padStart(2, "0");
        const m = (t % 60).toString().padStart(2, "0");
        const time = `${h}:${m}`;
        const slotEnd = t + duracion;
        const overlaps = occupied.some((o) => {
          const oStart = parseTimeToMinutes(o.time);
          const oEnd = oStart + o.duracion;
          return t < oEnd && slotEnd > oStart;
        });
        if (!overlaps) slots.push({ id: `__pt__${time}`, time });
      }

      return NextResponse.json({ appointments: slots });
    }

    return NextResponse.json({ error: "Se requiere el parámetro 'month' o 'date'" }, { status: 400 });
  }
  // --- fin POR_TIPO ---

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month))
      return NextResponse.json({ error: "Formato de mes inválido (esperado YYYY-MM)" }, { status: 400 });

    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    // Skip months already fully in the past
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (lastDayOfMonth < today) {
      return NextResponse.json({ dates: [] });
    }

    const hasConfigs = await ensureAppointmentsForMonth(serviceProviderId, year, monthIndex, month);

    if (!hasConfigs) {
      return NextResponse.json({ dates: [], noConfigs: true });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        serviceProviderId,
        date: { startsWith: month },
        isActive: true,
        scheduleConfig: { isActive: true },
        OR: [
          { booking: { is: null } },
          { booking: { status: "cancelled" } },
        ],
      },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "asc" },
    });

    console.log(`[available-slots] serviceProviderId=${serviceProviderId}, month=${month}, freeDates=${appointments.length}`);
    return NextResponse.json({ dates: appointments.map((a) => a.date) });
  }

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: "Formato de fecha inválido (esperado YYYY-MM-DD)" }, { status: 400 });

    const appointments = await prisma.appointment.findMany({
      where: {
        serviceProviderId,
        date,
        isActive: true,
        scheduleConfig: { isActive: true },
        OR: [
          { booking: { is: null } },
          { booking: { status: "cancelled" } },
        ],
      },
      select: { id: true, time: true },
      orderBy: { time: "asc" },
    });

    return NextResponse.json({ appointments });
  }

  return NextResponse.json(
    { error: "Se requiere el parámetro 'month' o 'date'" },
    { status: 400 }
  );
}
