import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";


export const GET = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  const sp = await prisma.serviceProvider.findUnique({
    where: { id: userId },
    select: { modoTurno: true },
  });

  if (!sp) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  const isOwner = !!(await prisma.businessProfile.findUnique({
    where: { serviceProviderId: userId },
    select: { id: true },
  }));

  let tieneSucursal = true;
  if (!isOwner) {
    const branchCount = await prisma.empleadoSucursal.count({
      where: { serviceProviderId: userId },
    });
    tieneSucursal = branchCount > 0;
  }

  return NextResponse.json({ modoTurno: sp.modoTurno, tieneSucursal }, { status: 200 });
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
