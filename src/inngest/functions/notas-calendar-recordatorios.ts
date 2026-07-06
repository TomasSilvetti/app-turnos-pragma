import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendPushToDevice } from "@/lib/notas/notas-push";
import { getBuenosAiresParts } from "@/lib/notas/time";

const pad = (n: number) => String(n).padStart(2, "0");

function etiquetaAnticipacion(min: number): string {
  if (min <= 0) return "empieza ahora";
  if (min % 1440 === 0) return `en ${min / 1440} día${min / 1440 > 1 ? "s" : ""}`;
  if (min % 60 === 0) return `en ${min / 60} h`;
  return `en ${min} min`;
}

// Corre cada minuto (hora Argentina). Dispara los recordatorios de las actividades
// del calendario cuya hora de aviso (inicio − minutos de anticipación) coincide con
// el minuto actual. `firedKeys` evita envíos duplicados.
export const notasCalendarRecordatorios = inngest.createFunction(
  { id: "notas-calendar-recordatorios", triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires * * * * *" }] },
  async ({ step }) => {
    const now = getBuenosAiresParts();
    const nowTime = `${pad(now.hh)}:${pad(now.mm)}`;

    // Sólo actividades de hoy en adelante con al menos un recordatorio.
    const eventos = await step.run("fetch-eventos", () =>
      prisma.notaCalendarEvent.findMany({
        where: { date: { gte: now.dateStr }, NOT: { reminderOffsets: { isEmpty: true } } },
        select: {
          id: true,
          deviceId: true,
          date: true,
          startTime: true,
          title: true,
          reminderOffsets: true,
          firedKeys: true,
        },
      })
    );

    let enviados = 0;

    for (const ev of eventos) {
      const [y, mo, d] = ev.date.split("-").map(Number);
      const [sh, sm] = ev.startTime.split(":").map(Number);
      // Tratamos la hora de pared como UTC para hacer aritmética sin líos de zona.
      const inicioMs = Date.UTC(y, mo - 1, d, sh, sm);

      const nuevasKeys: string[] = [];
      for (const offset of ev.reminderOffsets) {
        const key = String(offset);
        if (ev.firedKeys.includes(key) || nuevasKeys.includes(key)) continue;

        const trig = new Date(inicioMs - offset * 60000);
        const tDate = `${trig.getUTCFullYear()}-${pad(trig.getUTCMonth() + 1)}-${pad(trig.getUTCDate())}`;
        const tTime = `${pad(trig.getUTCHours())}:${pad(trig.getUTCMinutes())}`;

        if (tDate === now.dateStr && tTime === nowTime) nuevasKeys.push(key);
      }

      if (nuevasKeys.length === 0) continue;

      await step.run(`enviar-${ev.id}`, async () => {
        const titulo = ev.title?.trim() || "Actividad";
        const offsetMin = Math.min(...nuevasKeys.map(Number));
        await sendPushToDevice(ev.deviceId, {
          title: `⏰ ${titulo}`,
          body: `${titulo} ${etiquetaAnticipacion(offsetMin)} (${ev.startTime})`,
          url: `/notas/calendario`,
          tag: `cal-${ev.id}-${offsetMin}`,
        }).catch(() => {});

        await prisma.notaCalendarEvent.update({
          where: { id: ev.id },
          data: { firedKeys: { push: nuevasKeys } },
        });
      });

      enviados += nuevasKeys.length;
    }

    return { revisados: eventos.length, enviados };
  }
);
