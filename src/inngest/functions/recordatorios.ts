import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/twilio";
import { sendPushToCliente, sendEmailToCliente } from "@/lib/push-notifications";


function getDateStringBuenosAires(offsetDays = 0): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  now.setDate(now.getDate() + offsetDays);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentHourBuenosAires(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  ).getHours();
}

// Corre diariamente a las 10:00 (hora Argentina) — recordatorio día anterior
export const recordatorioDiaAnterior = inngest.createFunction(
  { id: "recordatorio-dia-anterior", cron: "TZ=America/Argentina/Buenos_Aires 0 10 * * *" },
  async ({ step }) => {
    const tomorrow = getDateStringBuenosAires(1);

    const bookings = await step.run("fetch-bookings", () =>
      prisma.booking.findMany({
        where: {
          whatsappReminderSentAt: null,
          status: { in: ["pending", "confirmed"] },
          appointment: { date: tomorrow, isActive: true },
        },
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          clienteId: true,
          appointment: {
            select: {
              date: true,
              time: true,
              serviceProviderId: true,
              serviceType: { select: { title: true } },
              sucursal: { select: { address: true } },
            },
          },
        },
      })
    );

    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      await step.run(`recordatorio-${booking.id}`, async () => {
        try {
          const businessProfile = await prisma.businessProfile.findFirst({
            where: {
              OR: [
                { serviceProviderId: booking.appointment.serviceProviderId },
                { empleados: { some: { serviceProviderId: booking.appointment.serviceProviderId } } },
              ],
            },
            select: { name: true, address: true },
          });

          const businessName = businessProfile?.name ?? "el negocio";
          const address = booking.appointment.sucursal?.address ?? businessProfile?.address ?? null;
          const serviceInfo = booking.appointment.serviceType?.title
            ? ` · ${booking.appointment.serviceType.title}`
            : "";
          const dateStr = booking.appointment.date.split("-").reverse().join("/");
          const addressLine = address ? `\n📍 Dirección: ${address}` : "";

          if (booking.clientPhone) {
            const waBody = `¡Hola ${booking.clientName}! 👋 Te recordamos que mañana tenés un turno en ${businessName}.\n\n📅 Fecha: ${dateStr}\n🕐 Hora: ${booking.appointment.time} hs${serviceInfo}${addressLine}\n\n¡Te esperamos!`;
            await sendWhatsApp({ to: booking.clientPhone, body: waBody });
          }

          if (booking.clienteId) {
            const title = `Recordatorio: turno mañana en ${businessName}`;
            const body = `Tenés turno mañana (${dateStr}) a las ${booking.appointment.time} hs${serviceInfo}.${address ? ` Dirección: ${address}.` : ""}`;
            await sendPushToCliente(booking.clienteId, { title, body }).catch(() => {});
            await sendEmailToCliente(booking.clienteId, { title, body }).catch(() => {});
          }

          await prisma.booking.update({
            where: { id: booking.id },
            data: { whatsappReminderSentAt: new Date() },
          });

          sent++;
        } catch (err) {
          console.error(`[recordatorio-dia-anterior] Error booking ${booking.id}:`, err);
          failed++;
        }
      });
    }

    return { sent, failed, total: bookings.length };
  }
);

// Corre cada hora — recordatorio 3hs antes del turno (solo clientes registrados)
export const recordatorio3HsAntes = inngest.createFunction(
  { id: "recordatorio-3hs-antes", cron: "TZ=America/Argentina/Buenos_Aires 0 * * * *" },
  async ({ step }) => {
    const today = getDateStringBuenosAires();
    const currentHour = getCurrentHourBuenosAires();

    const bookings = await step.run("fetch-bookings", () =>
      prisma.booking.findMany({
        where: {
          preReminderSentAt: null,
          status: { in: ["pending", "confirmed"] },
          clienteId: { not: null },
          appointment: { date: today, isActive: true },
        },
        select: {
          id: true,
          clientName: true,
          clienteId: true,
          appointment: {
            select: {
              date: true,
              time: true,
              serviceProviderId: true,
              serviceType: { select: { title: true } },
              sucursal: { select: { address: true } },
            },
          },
        },
      })
    );

    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      if (!booking.clienteId) continue;

      const [apptHour, apptMin] = booking.appointment.time.split(":").map(Number);
      const hoursUntil = apptHour + apptMin / 60 - currentHour;

      // Enviar cuando falten entre 2.5 y 3.5 horas (ventana de 1h para el cron horario)
      if (hoursUntil < 2.5 || hoursUntil > 3.5) continue;

      const clienteId = booking.clienteId;
      await step.run(`pre-recordatorio-${booking.id}`, async () => {
        try {
          const businessProfile = await prisma.businessProfile.findFirst({
            where: {
              OR: [
                { serviceProviderId: booking.appointment.serviceProviderId },
                { empleados: { some: { serviceProviderId: booking.appointment.serviceProviderId } } },
              ],
            },
            select: { name: true, address: true },
          });

          const businessName = businessProfile?.name ?? "el negocio";
          const address = booking.appointment.sucursal?.address ?? businessProfile?.address ?? null;
          const serviceInfo = booking.appointment.serviceType?.title
            ? ` · ${booking.appointment.serviceType.title}`
            : "";
          const addressLine = address ? ` Dirección: ${address}.` : "";

          const title = `Recordatorio: turno en 3 horas en ${businessName}`;
          const body = `Hoy a las ${booking.appointment.time} hs${serviceInfo} tenés turno en ${businessName}.${addressLine} ¡Te esperamos!`;

          await sendPushToCliente(clienteId, { title, body }).catch(() => {});
          await sendEmailToCliente(clienteId, { title, body }).catch(() => {});

          await prisma.booking.update({
            where: { id: booking.id },
            data: { preReminderSentAt: new Date() },
          });

          sent++;
        } catch (err) {
          console.error(`[recordatorio-3hs-antes] Error booking ${booking.id}:`, err);
          failed++;
        }
      });
    }

    return { sent, failed, total: bookings.length };
  }
);
