import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendWhatsApp } from "@/lib/twilio";

const prisma = new PrismaClient();

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tomorrow = getTomorrowDateString();

  const bookings = await prisma.booking.findMany({
    where: {
      whatsappReminderSentAt: null,
      status: { in: ["pending", "confirmed"] },
      appointment: {
        date: tomorrow,
        isActive: true,
      },
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceProviderId: true,
          serviceType: { select: { title: true } },
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    if (!booking.clientPhone) {
      failed++;
      continue;
    }

    try {
      const businessProfile = await prisma.businessProfile.findFirst({
        where: {
          OR: [
            { serviceProviderId: booking.appointment.serviceProviderId },
            { empleados: { some: { serviceProviderId: booking.appointment.serviceProviderId } } },
          ],
        },
        select: { name: true },
      });

      const businessName = businessProfile?.name ?? "el negocio";
      const serviceInfo = booking.appointment.serviceType?.title
        ? ` · ${booking.appointment.serviceType.title}`
        : "";
      const body = `¡Hola ${booking.clientName}! 👋 Te recordamos que mañana tenés un turno en ${businessName}.\n\n📅 Fecha: ${booking.appointment.date}\n🕐 Hora: ${booking.appointment.time} hs${serviceInfo}\n\n¡Te esperamos!`;

      await sendWhatsApp({ to: booking.clientPhone, body });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { whatsappReminderSentAt: new Date() },
      });

      sent++;
    } catch (err) {
      console.error(`[WhatsApp] Error al enviar recordatorio para booking ${booking.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: bookings.length });
}
