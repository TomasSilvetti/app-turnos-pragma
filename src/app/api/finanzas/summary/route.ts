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
  const now = new Date();

  // Turnos confirmados con fecha+hora pasada
  const confirmedBookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      appointment: { serviceProviderId },
    },
    select: {
      clientName: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceType: { select: { price: true } },
        },
      },
    },
  });

  const ingresos = confirmedBookings
    .filter((b) => {
      const [year, month, day] = b.appointment.date.split("-").map(Number);
      const [hour, minute] = b.appointment.time.split(":").map(Number);
      const appointmentDate = new Date(year, month - 1, day, hour, minute);
      return appointmentDate < now;
    })
    .map((b) => ({
      hora: b.appointment.time,
      fecha: b.appointment.date,
      clienteNombre: b.clientName,
      // Si no tiene serviceType, se omite del cálculo (monto 0)
      monto: b.appointment.serviceType ? Number(b.appointment.serviceType.price) : 0,
    }))
    .sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.hora}`);
      const dateB = new Date(`${b.fecha}T${b.hora}`);
      return dateB.getTime() - dateA.getTime();
    });

  const expenses = await prisma.expense.findMany({
    where: { serviceProviderId },
    select: { id: true, descripcion: true, monto: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const egresos = expenses.map((e) => ({
    id: e.id,
    descripcion: e.descripcion,
    monto: Number(e.monto),
    createdAt: e.createdAt.toISOString(),
  }));

  const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
  const totalEgresos = egresos.reduce((sum, e) => sum + e.monto, 0);
  const balanceNeto = totalIngresos - totalEgresos;

  return NextResponse.json(
    { totalIngresos, totalEgresos, balanceNeto, ingresos, egresos },
    { status: 200 }
  );
}
