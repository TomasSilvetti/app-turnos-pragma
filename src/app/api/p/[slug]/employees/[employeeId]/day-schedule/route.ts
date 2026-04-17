import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/p/[slug]/employees/[employeeId]/day-schedule?date=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; employeeId: string }> }
) {
  const { slug, employeeId } = await params;
  const date = request.nextUrl.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "El parámetro 'date' es requerido en formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Verificar que el negocio existe
  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // Verificar que el empleado es POR_TIPO
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

  // Calcular día de la semana (0=Dom, 1=Lun, ..., 6=Sáb)
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = (new Date(year, month - 1, day).getDay() + 6) % 7;

  // Buscar ScheduleConfig activa para ese empleado y día
  const scheduleConfig = await prisma.scheduleConfig.findFirst({
    where: {
      businessProfileId: profile.id,
      serviceProviderId: employeeId,
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
    },
    select: {
      startTime: true,
      endTime: true,
      serviceTypes: {
        select: { id: true, title: true, duracion: true, description: true, price: true },
      },
    },
  });

  if (!scheduleConfig) {
    return NextResponse.json(
      { error: "No hay horario de atención configurado para este día" },
      { status: 404 }
    );
  }

  // Turnos activos del empleado para esa fecha
  const appointments = await prisma.appointment.findMany({
    where: {
      serviceProviderId: employeeId,
      date,
      isActive: true,
      booking: { isNot: null },
    },
    select: {
      id: true,
      time: true,
      serviceType: { select: { duracion: true } },
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
      description: st.description ?? null,
      price: st.price !== null && st.price !== undefined ? Number(st.price) : 0,
    })),
  });
}
