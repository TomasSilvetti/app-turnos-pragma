import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
  daysOfWeek: number[],
  skipBefore: Date
): { date: string; time: string }[] {
  const startTotal = parseTimeToMinutes(startTime);
  const endTotal = parseTimeToMinutes(endTime);
  const daysSet = new Set(daysOfWeek);
  const slots: { date: string; time: string }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date < skipBefore) continue;
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
  const monthIndex = Number(monthStr) - 1; // 0-indexed

  // Reject months fully in the past
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
      scheduleConfig: {
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

  if (!profile.scheduleConfig) {
    return NextResponse.json({ slots: [] });
  }

  const config = profile.scheduleConfig;
  const serviceProviderId = profile.serviceProviderId;

  // Check if appointments already exist for this month
  const existingCount = await prisma.appointment.count({
    where: {
      serviceProviderId,
      date: { startsWith: month },
    },
  });

  if (existingCount === 0) {
    const slots = generateSlotsForMonth(
      year,
      monthIndex,
      config.startTime,
      config.endTime,
      config.intervalMinutes,
      config.daysOfWeek,
      today
    );

    if (slots.length > 0) {
      await prisma.appointment.createMany({
        data: slots.map((s) => ({
          date: s.date,
          time: s.time,
          scheduleConfigId: config.id,
          serviceProviderId,
          isActive: true,
        })),
      });
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      serviceProviderId,
      date: { startsWith: month },
      isActive: true,
      OR: [
        { booking: { is: null } },
        { booking: { status: { not: "confirmed" } } },
      ],
    },
    select: { id: true, date: true, time: true },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return NextResponse.json({ slots: appointments });
}
