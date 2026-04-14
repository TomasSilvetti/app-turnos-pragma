import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const granularidad = searchParams.get("granularidad") ?? "mes"; // "dia" | "mes"

  // Obtener el businessProfile del admin logueado
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: { id: true, serviceProviderId: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // IDs de empleados del negocio vía raw query (evita dependencia del cliente generado)
  const empleadoRows = await prisma.$queryRaw<{ serviceProviderId: string }[]>`
    SELECT "serviceProviderId" FROM empleado_empresas WHERE "businessProfileId" = ${businessProfile.id}
  `;

  // IDs de todos los proveedores del negocio (admin + empleados)
  const allProviderIds: string[] = [
    businessProfile.serviceProviderId,
    ...empleadoRows.map((e) => e.serviceProviderId),
  ];

  const dateFilter = desde && hasta ? { gte: desde, lte: hasta } : undefined;

  const appointmentWhere = {
    serviceProviderId: { in: allProviderIds },
    ...(dateFilter ? { date: dateFilter } : {}),
  };

  // Traer TODOS los bookings del negocio (con o sin clienteId registrado)
  const bookings = await prisma.booking.findMany({
    where: {
      appointment: appointmentWhere,
    },
    select: {
      clienteId: true,
      cliente: { select: { sexo: true, edad: true } },
      appointment: {
        select: {
          date: true,
          serviceType: { select: { title: true, price: true } },
          serviceProvider: { select: { id: true, name: true } },
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

  // edadPromedio y distribucionSexos: solo clientes registrados
  const bookingsConCliente = bookings.filter((b) => b.clienteId != null);

  const edades = bookingsConCliente
    .map((b) => b.cliente?.edad)
    .filter((e): e is number => e != null);
  const edadPromedio =
    edades.length > 0
      ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
      : null;

  const sexoCount: Record<string, number> = {};
  for (const b of bookingsConCliente) {
    const sexo = b.cliente?.sexo;
    if (sexo) sexoCount[sexo] = (sexoCount[sexo] ?? 0) + 1;
  }
  const distribucionSexos = Object.entries(sexoCount).map(([sexo, cantidad]) => ({
    sexo,
    cantidad,
  }));

  // distribucionTiposTurno: todos los bookings
  const tipoCount: Record<string, number> = {};
  for (const b of bookings) {
    const tipo = b.appointment.serviceType?.title ?? "Sin tipo";
    tipoCount[tipo] = (tipoCount[tipo] ?? 0) + 1;
  }
  const distribucionTiposTurno = Object.entries(tipoCount).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
  }));

  // turnosPorEmpleado: todos los bookings, agrupados por empleado
  const empleadoTurnosCount: Record<string, { nombre: string; cantidad: number }> = {};
  for (const b of bookings) {
    const id = b.appointment.serviceProvider.id;
    const nombre = b.appointment.serviceProvider.name;
    if (!empleadoTurnosCount[id]) {
      empleadoTurnosCount[id] = { nombre, cantidad: 0 };
    }
    empleadoTurnosCount[id].cantidad += 1;
  }
  const turnosPorEmpleado = Object.values(empleadoTurnosCount);

  // ingresosPorEmpleado: todos los bookings, agrupados por empleado
  const empleadoIngresosMap: Record<string, { nombre: string; ingreso: number }> = {};
  for (const b of bookings) {
    const id = b.appointment.serviceProvider.id;
    const nombre = b.appointment.serviceProvider.name;
    const monto = b.appointment.serviceType ? Number(b.appointment.serviceType.price) : 0;
    if (!empleadoIngresosMap[id]) {
      empleadoIngresosMap[id] = { nombre, ingreso: 0 };
    }
    empleadoIngresosMap[id].ingreso += monto;
  }
  const ingresosPorEmpleado = Object.values(empleadoIngresosMap);

  return NextResponse.json(
    { turnosPorMes, edadPromedio, distribucionSexos, distribucionTiposTurno, turnosPorEmpleado, ingresosPorEmpleado },
    { status: 200 }
  );
}
