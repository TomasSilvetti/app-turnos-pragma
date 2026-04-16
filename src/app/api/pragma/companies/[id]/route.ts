import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifySessionToken, PRAGMA_COOKIE } from "@/lib/pragma-auth";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(PRAGMA_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // id es el serviceProviderId del dueño
  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: {
      id: true,
      isActive: true,
      businessProfile: {
        select: {
          id: true,
          empleados: { select: { serviceProviderId: true } },
        },
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const newActive = !provider.isActive;

  // IDs de todos los empleados de la empresa
  const empleadoIds =
    provider.businessProfile?.empleados.map((e) => e.serviceProviderId) ?? [];

  // Actualizar dueño + todos los empleados en una transacción
  await prisma.$transaction([
    prisma.serviceProvider.update({
      where: { id },
      data: { isActive: newActive },
    }),
    ...(empleadoIds.length > 0
      ? [
          prisma.serviceProvider.updateMany({
            where: { id: { in: empleadoIds } },
            data: { isActive: newActive },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ isActive: newActive });
}
