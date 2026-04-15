import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceProviderId = session.user.id;
  const { bookingId } = await params;

  // Obtener el perfil del negocio del admin autenticado
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true, slug: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  // Obtener el booking con su appointment
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [
        { appointment: { serviceProviderId } },
        {
          appointment: {
            serviceProvider: {
              empresas: { some: { businessProfileId: businessProfile.id } },
            },
          },
        },
      ],
    },
    select: {
      appointment: {
        select: {
          sucursalId: true,
          serviceProviderId: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const apptSucursalId = booking.appointment.sucursalId;
  const apptEmpleadoId = booking.appointment.serviceProviderId;

  // Verificar si hay algún empleado asignado a alguna sucursal en este negocio
  const anyEmpleadoSucursal = await prisma.empleadoSucursal.findFirst({
    where: {
      sucursal: { businessProfileId: businessProfile.id },
    },
    select: { id: true },
  });

  if (!anyEmpleadoSucursal) {
    return NextResponse.json({
      sucursalId: null,
      empleadoId: apptEmpleadoId,
      sucursalValid: false,
      empleadoValid: false,
      noEmpleadosDisponibles: true,
      slug: businessProfile.slug,
    });
  }

  // Verificar si el empleado del appointment tiene la sucursal asignada
  let sucursalValid = false;
  let empleadoValid = false;

  if (apptSucursalId) {
    const assignment = await prisma.empleadoSucursal.findFirst({
      where: {
        serviceProviderId: apptEmpleadoId,
        sucursalId: apptSucursalId,
      },
      select: { id: true },
    });
    sucursalValid = true;
    empleadoValid = assignment !== null;
  }

  return NextResponse.json({
    sucursalId: apptSucursalId,
    empleadoId: apptEmpleadoId,
    sucursalValid,
    empleadoValid,
    noEmpleadosDisponibles: false,
    slug: businessProfile.slug,
  });
}
