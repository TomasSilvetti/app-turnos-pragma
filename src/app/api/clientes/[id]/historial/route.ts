import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";
import { resolveBusinessProfile, resolveAllProviderIds } from "@/lib/business-auth";

const prisma = new PrismaClient();

export const GET = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: clienteId } = await context.params;

  const businessProfile = await resolveBusinessProfile(req.auth.user.id);

  if (!businessProfile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const allProviderIds = await resolveAllProviderIds(businessProfile.id);

  const bookings = await prisma.booking.findMany({
    where: {
      clienteId,
      appointment: { serviceProviderId: { in: allProviderIds } },
    },
    select: {
      appointment: {
        select: {
          date: true,
          serviceType: { select: { title: true, price: true } },
          serviceProvider: { select: { name: true } },
        },
      },
    },
  });

  if (bookings.length === 0) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const visitas = bookings
    .map((b) => ({
      fecha: b.appointment.date,
      tipoTurno: b.appointment.serviceType?.title ?? "Sin tipo",
      monto: b.appointment.serviceType ? Number(b.appointment.serviceType.price) : 0,
      empleado: b.appointment.serviceProvider.name,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Calcular frecuencia promedio en días entre visitas consecutivas
  let frecuenciaPromedio: number | null = null;
  if (visitas.length > 1) {
    const timestamps = visitas
      .map((v) => new Date(v.fecha).getTime())
      .sort((a, b) => a - b);
    const diffs: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      diffs.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24));
    }
    frecuenciaPromedio = Math.round(
      diffs.reduce((a, b) => a + b, 0) / diffs.length
    );
  }

  return NextResponse.json({ frecuenciaPromedio, visitas }, { status: 200 });
});
