import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRol = (session.user as { rol?: string }).rol ?? "propietario";
  if (userRol !== "propietario") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: { cashEnabled: true, transferEnabled: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRol = (session.user as { rol?: string }).rol ?? "propietario";
  if (userRol !== "propietario") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  let body: { cashEnabled?: boolean; transferEnabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { cashEnabled, transferEnabled } = body;

  if (cashEnabled === false && transferEnabled === false) {
    return NextResponse.json(
      { error: "Debe haber al menos un método de pago activo" },
      { status: 400 }
    );
  }

  const updated = await prisma.businessProfile.update({
    where: { serviceProviderId: session.user.id },
    data: {
      ...(typeof cashEnabled === "boolean" ? { cashEnabled } : {}),
      ...(typeof transferEnabled === "boolean" ? { transferEnabled } : {}),
    },
    select: { cashEnabled: true, transferEnabled: true },
  });

  return NextResponse.json(updated);
}
