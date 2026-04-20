import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; sucursalId: string }> }
) {
  const { slug, sucursalId } = await params;

  const [profile, sucursal] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { slug },
      select: {
        id: true,
        serviceProvider: {
          select: { id: true, name: true, modoTurno: true, isActive: true, attendsAppointments: true },
        },
      },
    }),
    prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: {
        businessProfileId: true,
        empleados: {
          select: {
            serviceProvider: { select: { id: true, name: true, modoTurno: true } },
          },
        },
      },
    }),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  if (!sucursal || sucursal.businessProfileId !== profile.id) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  const employees = sucursal.empleados.map((e) => ({
    id: e.serviceProvider.id,
    name: e.serviceProvider.name,
    modoTurno: e.serviceProvider.modoTurno,
  }));

  // Incluir al propietario si está activo, atiende turnos y no está ya en la lista
  const propietario = profile.serviceProvider;
  if (propietario && propietario.isActive && propietario.attendsAppointments) {
    const alreadyIncluded = employees.some((e) => e.id === propietario.id);
    if (!alreadyIncluded) {
      employees.unshift({
        id: propietario.id,
        name: propietario.name,
        modoTurno: propietario.modoTurno,
      });
    }
  }

  return NextResponse.json(employees);
}
