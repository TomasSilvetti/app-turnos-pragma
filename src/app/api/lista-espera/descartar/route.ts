import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";

export async function POST(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const token = request.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const entry = await prisma.listaEspera.findUnique({
    where: { notificacionToken: token },
    select: { id: true, clienteId: true, estado: true },
  });

  if (!entry || entry.clienteId !== session.clienteId)
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });

  // Marcar como expirada (sigue en la lista pero con estado que el cron puede reiniciar)
  await prisma.listaEspera.update({
    where: { id: entry.id },
    data: {
      estado: "expirada",
      notificacionToken: null,
      notificacionTokenExp: null,
      vacanteTurnoId: null,
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
