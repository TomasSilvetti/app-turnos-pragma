import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const [provider, sucursal] = await Promise.all([
    prisma.serviceProvider.findUnique({
      where: { id: userId },
      select: { rol: true },
    }),
    prisma.empleadoSucursal.findFirst({
      where: { serviceProviderId: userId },
      select: { sucursalId: true },
    }),
  ]);

  return NextResponse.json({ hasSucursal: !!sucursal, rol: provider?.rol ?? "propietario" });
}
