import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceProviderId = session.user.id;

  const profile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { brandColor } = body as { brandColor?: string };

  if (!brandColor || !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
    return NextResponse.json(
      { error: "El campo brandColor debe ser un color hexadecimal válido (ej: #253551)" },
      { status: 400 }
    );
  }

  const updated = await prisma.businessProfile.update({
    where: { serviceProviderId },
    data: { brandColor },
    select: { brandColor: true },
  });

  return NextResponse.json(updated);
}
