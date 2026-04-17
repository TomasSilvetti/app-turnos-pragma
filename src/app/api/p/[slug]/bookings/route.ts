import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: { appointmentId?: string; clientName?: string; clientPhone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { appointmentId, clientName, clientPhone } = body;

  if (!appointmentId || !clientName || !clientPhone) {
    return NextResponse.json(
      { error: "Los campos 'appointmentId', 'clientName' y 'clientPhone' son obligatorios" },
      { status: 400 }
    );
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { serviceProviderId: true, name: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: appointmentId,
          serviceProviderId: profile.serviceProviderId,
          isActive: true,
        },
        include: {
          booking: true,
          scheduleConfig: { select: { price: true } },
        },
      });

      if (!appointment) {
        throw { code: 404, message: "Turno no encontrado para este negocio" };
      }

      if (appointment.booking?.status === "confirmed" || appointment.booking?.status === "pending") {
        throw { code: 409, message: "Este turno ya fue reservado" };
      }

      const newBooking = await tx.booking.create({
        data: {
          appointmentId,
          clientName,
          clientPhone,
          status: "pending",
        },
      });

      return {
        bookingId: newBooking.id,
        appointmentId,
        time: appointment.time,
        date: appointment.date,
        price: appointment.scheduleConfig ? Number(appointment.scheduleConfig.price) : null,
        businessName: profile.name,
      };
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 404) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e.code === 409) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw err;
  }
}
