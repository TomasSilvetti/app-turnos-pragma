import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol?: string }).rol ?? "propietario";
  const isAdmin = userRol === "propietario" || userRol === "administrador";

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  let serviceProviderId = session.user.id;

  if (employeeId && isAdmin) {
    serviceProviderId = employeeId;
  } else if (employeeId && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      appointment: { serviceProviderId },
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceType: { select: { title: true, price: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = bookings.map((b) => ({
    bookingId: b.id,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    status: b.status,
    appointmentDate: b.appointment.date,
    appointmentTime: b.appointment.time,
    serviceTypeTitle: b.appointment.serviceType?.title ?? "",
    serviceTypePrice: b.appointment.serviceType?.price
      ? Number(b.appointment.serviceType.price)
      : null,
  }));

  return NextResponse.json(result, { status: 200 });
}
