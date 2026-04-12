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
  const configs = await prisma.scheduleConfig.findMany({
    where: { businessProfile: { serviceProviderId }, isActive: true },
    select: { id: true, startTime: true, endTime: true, intervalMinutes: true, daysOfWeek: true },
  });

  if (configs.length === 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const serviceProviderId = session.user.id;
  const month = request.nextUrl.searchParams.get("month");
  const date = request.nextUrl.searchParams.get("date");

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
