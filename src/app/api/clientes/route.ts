import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: { id: true, serviceProviderId: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const empleadoRows = await prisma.$queryRaw<{ serviceProviderId: string }[]>`
    SELECT "serviceProviderId" FROM empleado_empresas WHERE "businessProfileId" = ${businessProfile.id}
  `;

  const allProviderIds: string[] = [
    businessProfile.serviceProviderId,
    ...empleadoRows.map((e) => e.serviceProviderId),
  ];

  const bookings = await prisma.booking.findMany({
    where: {
      clienteId: { not: null },
      appointment: { serviceProviderId: { in: allProviderIds } },
    },
    select: {
      clienteId: true,
      cliente: { select: { id: true, nombre: true, apellido: true } },
      appointment: {
        select: {
          serviceType: { select: { price: true } },
        },
      },
    },
  });

  // Agrupar por cliente y sumar ingresos
  const clienteMap = new Map<
    string,
    { id: string; nombre: string; apellido: string; ingresoTotal: number }
  >();

  for (const b of bookings) {
    if (!b.clienteId || !b.cliente) continue;
    const entry = clienteMap.get(b.clienteId) ?? {
      id: b.clienteId,
      nombre: b.cliente.nombre,
      apellido: b.cliente.apellido,
      ingresoTotal: 0,
    };
    entry.ingresoTotal += b.appointment.serviceType
      ? Number(b.appointment.serviceType.price)
      : 0;
    clienteMap.set(b.clienteId, entry);
  }

  const clientes = Array.from(clienteMap.values());
  return NextResponse.json(clientes, { status: 200 });
}
