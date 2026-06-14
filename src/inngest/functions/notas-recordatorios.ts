import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendPushToDevice } from "@/lib/notas/notas-push";
import { getBuenosAiresParts } from "@/lib/notas/time";

// Corre cada minuto (hora Argentina). Dispara los recordatorios cuya hora
// coincide con el minuto actual y que corresponden al día (repetición semanal)
// o a su fecha única. `lastFiredKey` evita envíos duplicados en el mismo minuto.
export const notasRecordatorios = inngest.createFunction(
  { id: "notas-recordatorios", triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires * * * * *" }] },
  async ({ step }) => {
    const { dateStr, hh, mm, dow } = getBuenosAiresParts();
    const time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const firedKey = `${dateStr} ${time}`;

    const candidatos = await step.run("fetch-recordatorios", () =>
      prisma.notaReminder.findMany({
        where: { enabled: true, time },
        select: {
          id: true,
          notaId: true,
          deviceId: true,
          text: true,
          daysOfWeek: true,
          oneTimeDate: true,
          lastFiredKey: true,
          nota: { select: { title: true } },
        },
      })
    );

    let enviados = 0;

    for (const r of candidatos) {
      if (r.lastFiredKey === firedKey) continue;

      const repite = r.daysOfWeek.length > 0;
      const debeSonar = repite ? r.daysOfWeek.includes(dow) : r.oneTimeDate === dateStr;
      if (!debeSonar) continue;

      await step.run(`enviar-${r.id}`, async () => {
        const body = r.text?.trim() || r.nota.title?.trim() || "Tenés un recordatorio en tus notas";
        await sendPushToDevice(r.deviceId, {
          title: "⏰ Recordatorio",
          body,
          url: `/notas/${r.notaId}?reminder=${r.id}`,
          tag: `reminder-${r.id}`,
        }).catch(() => {});

        await prisma.notaReminder.update({
          where: { id: r.id },
          // Los de una sola vez se deshabilitan tras sonar.
          data: { lastFiredKey: firedKey, ...(repite ? {} : { enabled: false }) },
        });
      });

      enviados++;
    }

    return { revisados: candidatos.length, enviados };
  }
);
