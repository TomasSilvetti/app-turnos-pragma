import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceProviderId = session.user.id;
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const granularidad = searchParams.get("granularidad") ?? "mes"; // "dia" | "mes"

  const appointmentWhere =
    desde && hasta
      ? { serviceProviderId, date: { gte: desde, lte: hasta } }
      : { serviceProviderId };

  const bookings = await prisma.booking.findMany({
    where: {
      clienteId: { not: null },
      appointment: appointmentWhere,
    },
    select: {
      cliente: { select: { sexo: true, edad: true } },
      appointment: {
        select: {
          date: true,
          serviceType: { select: { title: true } },
        },
      },
    },
  });

  // turnosPorMes: agrupar por día (YYYY-MM-DD) o mes (YYYY-MM)
  const mesCount: Record<string, number> = {};
  for (const b of bookings) {
    const date = b.appointment.date; // YYYY-MM-DD
    const key =
      granularidad === "dia" ? date : `${date.split("-")[0]}-${date.split("-")[1]}`;
    mesCount[key] = (mesCount[key] ?? 0) + 1;
  }
  const turnosPorMes = Object.entries(mesCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidad]) => ({ mes, cantidad }));

  // edadPromedio: promedio ignorando nulls
  const edades = bookings
    .map((b) => b.cliente?.edad)
    .filter((e): e is number => e != null);
  const edadPromedio =
    edades.length > 0
      ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
      : null;

  // distribucionSexos: agrupar por sexo (ignorar nulls)
  const sexoCount: Record<string, number> = {};
  for (const b of bookings) {
    const sexo = b.cliente?.sexo;
    if (sexo) sexoCount[sexo] = (sexoCount[sexo] ?? 0) + 1;
  }
  const distribucionSexos = Object.entries(sexoCount).map(([sexo, cantidad]) => ({
    sexo,
    cantidad,
  }));

  // distribucionTiposTurno: agrupar por tipo de turno
  const tipoCount: Record<string, number> = {};
  for (const b of bookings) {
    const tipo = b.appointment.serviceType?.title ?? "Sin tipo";
    tipoCount[tipo] = (tipoCount[tipo] ?? 0) + 1;
  }
  const distribucionTiposTurno = Object.entries(tipoCount).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
  }));

  return NextResponse.json(
    { turnosPorMes, edadPromedio, distribucionSexos, distribucionTiposTurno },
    { status: 200 }
  );
}
