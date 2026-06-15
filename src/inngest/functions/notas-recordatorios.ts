import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendPushToDevice } from "@/lib/notas/notas-push";
import { getBuenosAiresParts, timeToMinutes } from "@/lib/notas/time";

// Corre cada minuto (hora Argentina). Dispara los recordatorios cuya hora
// coincide con el minuto actual y que corresponden al día (repetición semanal,
// fecha única o intervalo recurrente). `lastFiredKey` evita envíos duplicados.
export const notasRecordatorios = inngest.createFunction(
  { id: "notas-recordatorios", triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires * * * * *" }] },
  async ({ step }) => {
    const { dateStr, hh, mm, dow } = getBuenosAiresParts();
    const time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const firedKey = `${dateStr} ${time}`;
    const nowMin = hh * 60 + mm;

    const seleccion = {
      id: true,
      notaId: true,
      deviceId: true,
      text: true,
      time: true,
      daysOfWeek: true,
      oneTimeDate: true,
      intervalMinutes: true,
      endTime: true,
      lastFiredKey: true,
      nota: { select: { title: true } },
    } as const;

    // Hora fija (semanal o una sola vez): coinciden exactamente con el minuto actual.
    // Por intervalo: se evalúan todos y se calcula en código si toca este minuto.
    const candidatos = await step.run("fetch-recordatorios", () =>
      prisma.notaReminder.findMany({
        where: {
          enabled: true,
          OR: [
            { intervalMinutes: null, time },
            { intervalMinutes: { not: null } },
          ],
        },
        select: seleccion,
      })
    );

    let enviados = 0;

    for (const r of candidatos) {
      if (r.lastFiredKey === firedKey) continue;

      let debeSonar: boolean;
      let esIntervalo = false;

      if (r.intervalMinutes) {
        esIntervalo = true;
        const startMin = timeToMinutes(r.time);
        const endMin = r.endTime ? timeToMinutes(r.endTime) : 1439;
        const enVentana = nowMin >= startMin && nowMin <= endMin;
        const enDia = r.daysOfWeek.length > 0 ? r.daysOfWeek.includes(dow) : true;
        const enTick = (nowMin - startMin) % r.intervalMinutes === 0;
        debeSonar = enVentana && enDia && enTick;
      } else {
        const repite = r.daysOfWeek.length > 0;
        debeSonar = repite ? r.daysOfWeek.includes(dow) : r.oneTimeDate === dateStr;
      }

      if (!debeSonar) continue;

      await step.run(`enviar-${r.id}`, async () => {
        const body = r.text?.trim() || r.nota.title?.trim() || "Tenés un recordatorio en tus notas";
        await sendPushToDevice(r.deviceId, {
          title: "⏰ Recordatorio",
          body,
          url: `/notas/${r.notaId}?reminder=${r.id}`,
          tag: `reminder-${r.id}`,
        }).catch(() => {});

        const repiteSemanal = r.daysOfWeek.length > 0;
        await prisma.notaReminder.update({
          where: { id: r.id },
          // Solo los de "una sola vez" se deshabilitan tras sonar.
          data: { lastFiredKey: firedKey, ...(esIntervalo || repiteSemanal ? {} : { enabled: false }) },
        });
      });

      enviados++;
    }

    return { revisados: candidatos.length, enviados };
  }
);
