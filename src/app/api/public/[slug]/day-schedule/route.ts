import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


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

  // Buscar todas las ScheduleConfigs activas del empleado para ese día
  const scheduleConfigs = await prisma.scheduleConfig.findMany({
    where: {
      serviceProviderId: profile.serviceProviderId,
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
    },
    select: {
      startTime: true,
      endTime: true,
      serviceTypes: {
        select: { id: true, title: true, duracion: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  if (scheduleConfigs.length === 0) {
    return NextResponse.json(
      { error: "No hay horario de atención configurado para este día" },
      { status: 404 }
    );
  }

  const startTime = scheduleConfigs[0].startTime;
  const endTime = scheduleConfigs[scheduleConfigs.length - 1].endTime;

  // Calcular huecos entre franjas consecutivas
  const gaps: { from: string; to: string }[] = [];
  for (let i = 0; i < scheduleConfigs.length - 1; i++) {
    if (scheduleConfigs[i].endTime < scheduleConfigs[i + 1].startTime) {
      gaps.push({ from: scheduleConfigs[i].endTime, to: scheduleConfigs[i + 1].startTime });
    }
  }

  // Mergear serviceTypes (deduplicar por id)
  const serviceTypesMap = new Map<string, typeof scheduleConfigs[0]["serviceTypes"][0]>();
  for (const config of scheduleConfigs) {
    for (const st of config.serviceTypes) {
      serviceTypesMap.set(st.id, st);
    }
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
      serviceType: { select: { duracion: true } },
    },
    orderBy: { time: "asc" },
  });

  return NextResponse.json({
    startTime,
    endTime,
    gaps,
    appointments: appointments.map((a) => ({
      id: a.id,
      time: a.time,
      duracion: a.serviceType?.duracion ?? 0,
    })),
    serviceTypes: [...serviceTypesMap.values()].map((st) => ({
      id: st.id,
      title: st.title,
      duracion: st.duracion ?? 0,
    })),
  });
}
