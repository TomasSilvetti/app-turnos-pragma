import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToCliente } from "@/lib/push-notifications";
import crypto from "crypto";

const VENTANA_MINUTOS = 10;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  const limiteExpiracion = new Date(ahora.getTime() - VENTANA_MINUTOS * 60 * 1000);

  // ─── Paso 1: Expirar tokens vencidos y avanzar al siguiente elegible ───────
  const expiradas = await prisma.listaEspera.findMany({
    where: {
      estado: "notificada",
      notificacionTokenExp: { lt: ahora },
    },
    select: { id: true, serviceProviderId: true, vacanteTurnoId: true },
  });

  for (const entrada of expiradas) {
    await prisma.listaEspera.update({
      where: { id: entrada.id },
      data: {
        estado: "expirada",
        notificacionToken: null,
        notificacionTokenExp: null,
        vacanteTurnoId: null,
      },
    });
    if (entrada.vacanteTurnoId) {
      await notificarSiguiente(entrada.serviceProviderId, entrada.vacanteTurnoId, ahora);
    }
  }

  // ─── Paso 2: Detectar turnos recién liberados sin cliente notificado ────────
  const today = ahora.toISOString().split("T")[0];

  // Appointments sin booking activo con al menos una lista de espera activa para ese profesional
  const turnosLiberados = await prisma.appointment.findMany({
    where: {
      date: { gte: today },
      isActive: true,
      booking: null,
      serviceProvider: {
        listaEspera: {
          some: { estado: "activa" },
        },
      },
    },
    select: {
      id: true,
      serviceProviderId: true,
      date: true,
      time: true,
    },
  });

  for (const turno of turnosLiberados) {
    // Verificar que no haya ya alguien notificado para este turno
    const yaNotificado = await prisma.listaEspera.findFirst({
      where: {
        serviceProviderId: turno.serviceProviderId,
        vacanteTurnoId: turno.id,
        estado: "notificada",
      },
    });
    if (yaNotificado) continue;

    await notificarSiguiente(turno.serviceProviderId, turno.id, ahora);
  }

  return NextResponse.json({ ok: true, procesados: expiradas.length + turnosLiberados.length });
}

async function notificarSiguiente(serviceProviderId: string, vacanteTurnoId: string, ahora: Date) {
  const turno = await prisma.appointment.findUnique({
    where: { id: vacanteTurnoId },
    select: { date: true, time: true, serviceType: { select: { title: true } } },
  });

  if (!turno) return;

  // Recorrer elegibles por posición hasta encontrar uno que califique
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

  let elegible: typeof candidatos[number] | null = null;

  for (const candidato of candidatos) {
    // Filtrar por fecha: la vacante debe ser anterior al turno de respaldo del cliente
    if (candidato.bookingIdRespaldo) {
      const respaldo = await prisma.booking.findUnique({
        where: { id: candidato.bookingIdRespaldo },
        select: { appointment: { select: { date: true } } },
      });
      const fechaRespaldo = respaldo?.appointment?.date;
      if (fechaRespaldo && turno.date >= fechaRespaldo) continue;
    }

    // Filtrar por disponibilidad horaria configurada
    if (!candidato.cualquierVacante && candidato.disponibilidades.length > 0) {
      const fecha = new Date(turno.date + "T00:00:00");
      const diaSemana = (fecha.getDay() + 6) % 7; // 0=Lunes
      const [hora] = turno.time.split(":").map(Number);

      const encaja = candidato.disponibilidades.some((d) => {
        if (d.diaSemana !== diaSemana) return false;
        const [hInicio] = d.horaInicio.split(":").map(Number);
        const [hFin] = d.horaFin.split(":").map(Number);
        return hora >= hInicio && hora < hFin;
      });

      if (!encaja) continue;
    }

    elegible = candidato;
    break;
  }

  if (!elegible) return;

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
}
