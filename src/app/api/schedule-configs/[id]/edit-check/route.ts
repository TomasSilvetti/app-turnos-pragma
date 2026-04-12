import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

const DAYS_MAP: Record<string, number> = { L: 0, M: 1, X: 2, J: 3, V: 4, S: 5, D: 6 };

// JS getDay(): 0=Sun,1=Mon..6=Sat → Config: 0=Mon..6=Sun
function jsDateDayToConfigDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export const POST = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId: businessProfile.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { daysOfWeek, startTime, endTime } = body as {
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
  };

  if (!Array.isArray(daysOfWeek) || !startTime || !endTime) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const newDayInts = new Set(
    daysOfWeek.map((d) => DAYS_MAP[d] ?? -1).filter((d) => d !== -1)
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduleConfigId: id,
      booking: { status: { in: ["pending", "confirmed"] } },
    },
    select: {
      date: true,
      time: true,
      booking: {
        select: { clientName: true, clientPhone: true, status: true },
      },
    },
  });

  const conflicting = appointments
    .filter((a) => {
      const jsDay = new Date(a.date + "T00:00:00").getDay();
      const configDay = jsDateDayToConfigDay(jsDay);
      const dayConflict = !newDayInts.has(configDay);
      const timeConflict = a.time < startTime || a.time >= endTime;
      return dayConflict || timeConflict;
    })
    .map((a) => ({
      clientName: a.booking!.clientName,
      clientPhone: a.booking!.clientPhone,
      status: a.booking!.status,
      appointmentDate: a.date,
      appointmentTime: a.time,
    }));

  return NextResponse.json({ conflicting });
});
