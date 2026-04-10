import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
    const isoDay = (date.getDay() + 6) % 7;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const month = request.nextUrl.searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "El parámetro 'month' es obligatorio y debe tener el formato YYYY-MM" },
      { status: 400 }
    );
  }

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (lastDayOfMonth < today) {
    return NextResponse.json({ slots: [] });
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      serviceProviderId: true,
      scheduleConfigs: {
        where: { isActive: true },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          intervalMinutes: true,
          daysOfWeek: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  if (profile.scheduleConfigs.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  const serviceProviderId = profile.serviceProviderId;

  // Generate appointments for each active config if they don't exist yet for this month
  for (const config of profile.scheduleConfigs) {
    // Always delete unbooked appointments and regenerate to stay in sync with config changes
    await prisma.appointment.deleteMany({
      where: {
        scheduleConfigId: config.id,
        date: { startsWith: month },
        OR: [
          { booking: { is: null } },
          { booking: { status: { notIn: ["confirmed", "pending"] } } },
        ],
      },
    });

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
    );

    if (slots.length > 0) {
      await prisma.appointment.createMany({ data: slots });
    }

  }

  const configIds = profile.scheduleConfigs.map((c) => c.id);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduleConfigId: { in: configIds },
      date: { startsWith: month },
      isActive: true,
    },
    select: {
      id: true,
      date: true,
      time: true,
      booking: { select: { status: true } },
      scheduleConfig: {
        select: {
          price: true,
          serviceTypes: { select: { id: true, title: true, price: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return NextResponse.json({
    slots: appointments.map((a) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      price: a.scheduleConfig.price,
      booked: a.booking?.status === "confirmed" || a.booking?.status === "pending",
      serviceTypes: a.scheduleConfig.serviceTypes,
    })),
  });
}
