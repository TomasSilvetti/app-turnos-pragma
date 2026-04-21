import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";

export async function GET(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const bookingId = request.nextUrl.searchParams.get("bookingId");
  if (!bookingId)
    return NextResponse.json({ error: "El parámetro 'bookingId' es obligatorio" }, { status: 400 });

  const listaEntry = await prisma.listaEspera.findFirst({
    where: {
      bookingIdRespaldo: bookingId,
      clienteId: session.clienteId,
      estado: { in: ["activa", "notificada"] },
    },
    select: {
      id: true,
      serviceProvider: { select: { name: true } },
    },
  });

  return NextResponse.json(
    {
      esRespaldo: !!listaEntry,
      profesionalNombre: listaEntry?.serviceProvider?.name ?? null,
    },
    { status: 200 }
  );
}
