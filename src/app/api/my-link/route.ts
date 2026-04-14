import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;

  // Propietario: buscar su propio BusinessProfile
  const ownProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: userId },
    select: { slug: true },
  });

  if (ownProfile) {
    return NextResponse.json({ slug: ownProfile.slug, employeeId: userId });
  }

  // Empleado: buscar el BusinessProfile de su empresa
  const rel = await prisma.empleadoEmpresa.findFirst({
    where: { serviceProviderId: userId },
    select: {
      businessProfile: { select: { slug: true } },
    },
  });

  if (!rel) {
    return NextResponse.json({ error: "No se encontró un negocio asociado" }, { status: 404 });
  }

  return NextResponse.json({ slug: rel.businessProfile.slug, employeeId: userId });
}
