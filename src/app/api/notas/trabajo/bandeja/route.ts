import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado } from "@/lib/notas/trabajo";
import { DOC_VACIO } from "@/lib/notas/bandeja";

// La bandeja es única por device y se crea sola la primera vez que se la mira:
// es una nota fija, no algo que el usuario decida tener.
async function bandejaDe(deviceId: string) {
  const existente = await prisma.trabajoBandeja.findUnique({
    where: { deviceId },
    include: { sugerencias: { orderBy: { orden: "asc" } } },
  });
  if (existente) return existente;
  return prisma.trabajoBandeja.create({
    data: { deviceId, contenido: DOC_VACIO as unknown as Prisma.InputJsonValue },
    include: { sugerencias: { orderBy: { orden: "asc" } } },
  });
}

export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  return NextResponse.json({ bandeja: await bandejaDe(deviceId) });
}

// PUT: autoguardado del crudo mientras se pega y se escribe.
export async function PUT(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  if (!body?.contenido || typeof body.contenido !== "object") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const actual = await bandejaDe(deviceId);
  const bandeja = await prisma.trabajoBandeja.update({
    where: { id: actual.id },
    data: {
      contenido: body.contenido,
      // Escribir mientras hay un análisis pedido lo cancela: la sesión leería un
      // texto que ya no es el que está en pantalla y devolvería rangos que no
      // corresponden a nada.
      ...(actual.estado === "pendiente" ? { estado: "vacia", pedidoEn: null } : {}),
    },
    select: { id: true, estado: true, updatedAt: true },
  });
  return NextResponse.json({ bandeja });
}
