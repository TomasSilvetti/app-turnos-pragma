import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { emitNewBooking } from "@/lib/booking-emitter";


export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const serviceProviderId = session.user.id;
  const businessProfileId = (session.user as { businessProfileId?: string | null }).businessProfileId;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      appointment: {
        select: {
          serviceProviderId: true,
          serviceProvider: {
            select: {
              businessProfile: { select: { id: true } },
              empresas: { select: { businessProfileId: true } },
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const bookingOwnerId = booking.appointment.serviceProviderId;
  const sp = booking.appointment.serviceProvider;
  const bookingBusinessId =
    sp.businessProfile?.id ?? sp.empresas[0]?.businessProfileId ?? null;
  const isOwner = bookingOwnerId === serviceProviderId;
  const isAdminOfBusiness = !!businessProfileId && bookingBusinessId === businessProfileId;

  if (!isOwner && !isAdminOfBusiness) {
    return NextResponse.json({ error: "No tenés permiso para modificar este turno" }, { status: 403 });
  }

  if (booking.status !== "pending") {
    return NextResponse.json(
      { error: "Solo se pueden confirmar turnos con estado pendiente" },
      { status: 400 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "confirmed" },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
      updatedAt: true,
    },
  });

  emitNewBooking();

  return NextResponse.json(updated, { status: 200 });
}
