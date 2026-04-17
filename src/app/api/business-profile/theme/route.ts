import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


const VALID_THEMES = ["light", "dark"] as const;
type Theme = (typeof VALID_THEMES)[number];

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

  const { theme } = body as { theme?: string };

  if (!theme || !(VALID_THEMES as readonly string[]).includes(theme)) {
    return NextResponse.json(
      { error: 'El campo theme debe ser "light" o "dark"' },
      { status: 400 }
    );
  }

  const updated = await prisma.businessProfile.update({
    where: { serviceProviderId },
    data: { theme: theme as Theme },
    select: { theme: true },
  });

  return NextResponse.json(updated);
}
