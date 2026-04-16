import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifySessionToken, PRAGMA_COOKIE } from "@/lib/pragma-auth";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get(PRAGMA_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = params;

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });

  if (!provider) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const updated = await prisma.serviceProvider.update({
    where: { id },
    data: { isActive: !provider.isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json({ isActive: updated.isActive });
}
