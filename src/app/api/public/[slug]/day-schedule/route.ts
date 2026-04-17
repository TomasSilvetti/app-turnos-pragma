import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/public/[slug]/day-schedule?date=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "El parámetro 'date' es requerido en formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Obtener el perfil del empleado por slug
  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      serviceProviderId: true,
      serviceProvider: {
        select: { modoTurno: true },
      },
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

  // Calcular el día de la semana (0=Dom, 1=Lun, ..., 6=Sáb)
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = (new Date(year, month - 1, day).getDay() + 6) % 7;

  // Buscar la ScheduleConfig activa del empleado para ese día
  const scheduleConfig = await prisma.scheduleConfig.findFirst({
    where: {
      serviceProviderId: profile.serviceProviderId,
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
    },
    select: {
      startTime: true,
      endTime: true,
      serviceTypes: {
        select: {
          id: true,
          title: true,
          duracion: true,
        },
      },
    },
  });

  if (!scheduleConfig) {
    return NextResponse.json(
      { error: "No hay horario de atención configurado para este día" },
      { status: 404 }
    );
  }

  // Obtener los turnos activos del empleado para esa fecha
  const appointments = await prisma.appointment.findMany({
    where: {
      serviceProviderId: profile.serviceProviderId,
      date,
      isActive: true,
    },
    select: {
      id: true,
      time: true,
      serviceType: {
        select: { duracion: true },
      },
    },
    orderBy: { time: "asc" },
  });

  return NextResponse.json({
    startTime: scheduleConfig.startTime,
    endTime: scheduleConfig.endTime,
    appointments: appointments.map((a) => ({
      id: a.id,
      time: a.time,
      duracion: a.serviceType?.duracion ?? 0,
    })),
    serviceTypes: scheduleConfig.serviceTypes.map((st) => ({
      id: st.id,
      title: st.title,
      duracion: st.duracion ?? 0,
    })),
  });
}
