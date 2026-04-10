import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/../auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MercadoPagoPreferenceResponse {
  init_point?: string;
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json()) as { bookingId?: string };
  const { bookingId } = body;

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId es requerido" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      appointment: {
        include: {
          serviceProvider: true,
          serviceType: true,
          scheduleConfig: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking no encontrado" }, { status: 404 });
  }

  if (booking.appointment.serviceProviderId !== session.user.id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { serviceProvider, serviceType } = booking.appointment;

  if (!serviceProvider.mpAccessToken) {
    return NextResponse.json({ error: "mp_not_connected" }, { status: 400 });
  }

  const title = serviceType?.title ?? "Turno";
  const price = serviceType?.price ?? booking.appointment.scheduleConfig?.price;
  const unitPrice = price ? Number(price) : 0;

  const preferenceBody = {
    items: [
      {
        title,
        quantity: 1,
        unit_price: unitPrice,
        currency_id: "ARS",
      },
    ],
    metadata: {
      bookingId: booking.id,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
    },
  };

  let mpResponse: Response;
  try {
    mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceProvider.mpAccessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    });
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con MercadoPago" },
      { status: 502 }
    );
  }

  const data = (await mpResponse.json()) as MercadoPagoPreferenceResponse;

  if (!mpResponse.ok || !data.init_point) {
    return NextResponse.json(
      { error: data.message ?? "Error al crear la preferencia de pago en MercadoPago" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: data.init_point });
}
