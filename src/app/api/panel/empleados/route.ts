import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRol = (session.user as { rol?: string }).rol;
  if (userRol !== "propietario" && userRol !== "administrador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const businessProfileId = (session.user as { businessProfileId?: string | null }).businessProfileId;
  if (!businessProfileId) return NextResponse.json({ error: "Sin perfil de empresa" }, { status: 403 });

  const [propietarioRel, relaciones] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { id: businessProfileId },
      select: {
        serviceProvider: {
          select: { id: true, name: true, rol: true, isActive: true },
        },
      },
    }),
    prisma.empleadoEmpresa.findMany({
      where: { businessProfileId },
      select: {
        serviceProvider: {
          select: { id: true, name: true, rol: true, isActive: true },
        },
      },
    }),
  ]);

  const empleados: { id: string; nombre: string; rol: string }[] = [];

  if (propietarioRel?.serviceProvider?.isActive) {
    empleados.push({
      id: propietarioRel.serviceProvider.id,
      nombre: propietarioRel.serviceProvider.name,
      rol: propietarioRel.serviceProvider.rol,
    });
  }

  for (const r of relaciones) {
    if (r.serviceProvider.isActive) {
      empleados.push({
        id: r.serviceProvider.id,
        nombre: r.serviceProvider.name,
        rol: r.serviceProvider.rol,
      });
    }
  }

  return NextResponse.json(empleados, { status: 200 });
}