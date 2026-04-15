import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRol = (session.user as { rol?: string }).rol ?? "propietario";
  if (userRol !== "propietario") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const method = searchParams.get("method");

  if (method !== "cash" && method !== "transfer") {
    return NextResponse.json(
      { error: "El parámetro method debe ser 'cash' o 'transfer'" },
      { status: 400 }
    );
  }

  const paymentMethodValue = method === "cash" ? "cash" : "transfer";

  // Obtener el businessProfile del propietario
  const profile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: { id: true, serviceProviderId: true, empleados: { select: { serviceProviderId: true } } },
  });

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  // Todos los serviceProviderIds del negocio
  const allProviderIds = [
    profile.serviceProviderId,
    ...profile.empleados.map((e) => e.serviceProviderId),
  ];

  const count = await prisma.booking.count({
    where: {
      paymentMethod: paymentMethodValue,
      status: { in: ["pending", "confirmed"] },
      appointment: {
        serviceProviderId: { in: allProviderIds },
      },
    },
  });

  return NextResponse.json({ hasPendingBookings: count > 0, count });
}
