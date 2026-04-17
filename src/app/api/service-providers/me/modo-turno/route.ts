import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

export const GET = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = await prisma.serviceProvider.findUnique({
    where: { id: req.auth.user.id },
    select: { modoTurno: true },
  });

  if (!sp) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ modoTurno: sp.modoTurno }, { status: 200 });
});

export const PATCH = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { modoTurno } = body;

  if (modoTurno !== "FIJO" && modoTurno !== "POR_TIPO") {
    return NextResponse.json(
      { error: "El valor de modoTurno debe ser FIJO o POR_TIPO" },
      { status: 400 }
    );
  }

  const updated = await prisma.serviceProvider.update({
    where: { id: req.auth.user.id },
    data: { modoTurno },
    select: { modoTurno: true },
  });

  return NextResponse.json({ modoTurno: updated.modoTurno }, { status: 200 });
});
