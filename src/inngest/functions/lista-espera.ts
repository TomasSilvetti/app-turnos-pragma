import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendPushToCliente } from "@/lib/push-notifications";
import crypto from "crypto";

const VENTANA_MINUTOS = 10;
const MAX_CANDIDATOS = 20;

export const procesarVacante = inngest.createFunction(
  { id: "waitlist-procesar-vacante", triggers: [{ event: "waitlist/vacancy.created" }] },
  async ({ event, step }) => {
    const { appointmentId, serviceProviderId, date, time, serviceTypeTitle } = event.data as {
      appointmentId: string;
      serviceProviderId: string;
      date: string;
      time: string;
      serviceTypeTitle: string | null;
    };

    for (let intento = 0; intento < MAX_CANDIDATOS; intento++) {
      const notificado = await step.run(`notificar-candidato-${intento}`, async () => {
        return await notificarSiguiente(serviceProviderId, appointmentId, date, time, serviceTypeTitle);
      });

      if (!notificado) break;

      await step.sleep(`esperar-respuesta-${intento}`, `${VENTANA_MINUTOS}m`);

      const aceptado = await step.run(`verificar-aceptacion-${intento}`, async () => {
        const entrada = await prisma.listaEspera.findFirst({
          where: {
            serviceProviderId,
            vacanteTurnoId: appointmentId,
            estado: "notificada",
          },
          select: { id: true },
        });

        if (!entrada) return true; // token consumido: el cliente ya reservó

        // Token expirado: marcar como expirada y pasar al siguiente
        await prisma.listaEspera.update({
          where: { id: entrada.id },
          data: {
            estado: "expirada",
            notificacionToken: null,
            notificacionTokenExp: null,
            vacanteTurnoId: null,
          },
        });
        return false;
      });

      if (aceptado) break;
    }
  }
);

async function notificarSiguiente(
  serviceProviderId: string,
  vacanteTurnoId: string,
  date: string,
  time: string,
  serviceTypeTitle: string | null,
): Promise<boolean> {
  const ahora = new Date();
  const turno = { date, time, serviceType: serviceTypeTitle ? { title: serviceTypeTitle } : null };
  console.log(`[lista-espera] notificarSiguiente - serviceProviderId=${serviceProviderId} vacanteTurnoId=${vacanteTurnoId} date=${date} time=${time}`);

  // Verificar que el slot sigue libre
  const bookingExistente = await prisma.booking.findFirst({
    where: { appointmentId: vacanteTurnoId },
  });
  if (bookingExistente) {
    console.log(`[lista-espera] slot ocupado por booking ${bookingExistente.id}`);
    return false;
  }

  // Verificar que no haya alguien ya notificado para este turno
  const yaNotificado = await prisma.listaEspera.findFirst({
    where: { serviceProviderId, vacanteTurnoId, estado: "notificada" },
  });
  if (yaNotificado) {
    console.log(`[lista-espera] ya hay alguien notificado`);
    return true;
  }

  const candidatos = await prisma.listaEspera.findMany({
    where: { serviceProviderId, estado: "activa" },
    orderBy: { posicion: "asc" },
    select: {
      id: true,
      clienteId: true,
      cualquierVacante: true,
      disponibilidades: true,
      bookingIdRespaldo: true,
    },
  });
  console.log(`[lista-espera] candidatos activos: ${candidatos.length}`);

  let elegible: (typeof candidatos)[number] | null = null;

  for (const candidato of candidatos) {
    if (candidato.bookingIdRespaldo) {
      const respaldo = await prisma.booking.findUnique({
        where: { id: candidato.bookingIdRespaldo },
        select: { appointment: { select: { date: true } } },
      });
      const fechaRespaldo = respaldo?.appointment?.date;
      console.log(`[lista-espera] candidato ${candidato.id} - fechaRespaldo=${fechaRespaldo} turno.date=${turno.date} skip=${!!(fechaRespaldo && turno.date >= fechaRespaldo)}`);
      if (fechaRespaldo && turno.date >= fechaRespaldo) continue;
    }

    if (!candidato.cualquierVacante && candidato.disponibilidades.length > 0) {
      const fecha = new Date(turno.date + "T00:00:00");
      const diaSemana = (fecha.getDay() + 6) % 7; // 0=Lunes
      const [hora] = turno.time.split(":").map(Number);

      const encaja = candidato.disponibilidades.some((d: { diaSemana: number; horaInicio: string; horaFin: string }) => {
        if (d.diaSemana !== diaSemana) return false;
        const [hInicio] = d.horaInicio.split(":").map(Number);
        const [hFin] = d.horaFin.split(":").map(Number);
        return hora >= hInicio && hora < hFin;
      });

      console.log(`[lista-espera] candidato ${candidato.id} - disponibilidad encaja=${encaja} diaSemana=${diaSemana} hora=${hora}`);
      if (!encaja) continue;
    }

    elegible = candidato;
    break;
  }

  if (!elegible) {
    console.log(`[lista-espera] no hay candidato elegible`);
    return false;
  }
  console.log(`[lista-espera] candidato elegible: ${elegible.id}`);

  const token = crypto.randomBytes(32).toString("hex");
  const tokenExp = new Date(ahora.getTime() + VENTANA_MINUTOS * 60 * 1000);

  await prisma.listaEspera.update({
    where: { id: elegible.id },
    data: {
      estado: "notificada",
      notificadaAt: ahora,
      notificacionToken: token,
      notificacionTokenExp: tokenExp,
      vacanteTurnoId,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app-turnos.vercel.app";
  const deeplink = `${baseUrl}/lista-espera/vacante?token=${token}`;

  await sendPushToCliente(elegible.clienteId, {
    title: "¡Se liberó un turno!",
    body: `Hay una vacante el ${turno.date} a las ${turno.time}${turno.serviceType ? ` — ${turno.serviceType.title}` : ""}. Tenés ${VENTANA_MINUTOS} minutos para tomarlo. Tocá para reservar: ${deeplink}`,
  }).catch(() => {});

  return true;
}
