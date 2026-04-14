import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceProviderId = session.user.id;

  // Obtener el businessProfile del usuario autenticado (propietario) junto con sus empleados
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: {
      id: true,
      empleados: { select: { serviceProviderId: true } },
    },
  }) as { id: string; empleados: { serviceProviderId: string }[] } | null;

  // Obtener todos los serviceProviderIds de la empresa
  const allProviderIds: string[] = businessProfile
    ? Array.from(
        new Set([
          serviceProviderId,
          ...businessProfile.empleados.map((e) => e.serviceProviderId),
        ])
      )
    : [serviceProviderId];

  // Turnos confirmados de todos los miembros de la empresa
  const confirmedBookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      appointment: { serviceProviderId: { in: allProviderIds } },
    },
    select: {
      clientName: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceType: { select: { price: true } },
          serviceProvider: { select: { name: true } },
        },
      },
    },
  });

  const ingresos = confirmedBookings
    .map((b) => ({
      hora: b.appointment.time,
      fecha: b.appointment.date,
      clienteNombre: b.clientName,
      empleadoNombre: b.appointment.serviceProvider.name,
      monto: b.appointment.serviceType ? Number(b.appointment.serviceType.price) : 0,
    }))
    .sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.hora}`);
      const dateB = new Date(`${b.fecha}T${b.hora}`);
      return dateB.getTime() - dateA.getTime();
    });

  // Gastos de todos los miembros de la empresa
  const expenses = await prisma.expense.findMany({
    where: { serviceProviderId: { in: allProviderIds } },
    select: {
      id: true,
      descripcion: true,
      monto: true,
      createdAt: true,
      serviceProvider: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const egresos = expenses.map((e) => ({
    id: e.id,
    descripcion: e.descripcion,
    monto: Number(e.monto),
    createdAt: e.createdAt.toISOString(),
    adminNombre: e.serviceProvider.name,
  }));

  const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
  const totalEgresos = egresos.reduce((sum, e) => sum + e.monto, 0);
  const balanceNeto = totalIngresos - totalEgresos;

  return NextResponse.json(
    { totalIngresos, totalEgresos, balanceNeto, ingresos, egresos },
    { status: 200 }
  );
}
