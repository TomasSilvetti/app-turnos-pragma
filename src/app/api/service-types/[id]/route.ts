import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import { resolveBusinessProfile } from "@/lib/business-auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

export const PUT = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const businessProfile = await resolveBusinessProfile(req.auth.user.id);

  if (!businessProfile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.serviceType.findFirst({
    where: { id, businessProfileId: businessProfile.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tipo de turno no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const { title, description, price } = body;

  if (!title || description === undefined || description === null || price === undefined || price === null) {
    return NextResponse.json({ error: "Los campos title, description y price son requeridos" }, { status: 400 });
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor a cero" }, { status: 400 });
  }

  const updated = await prisma.serviceType.update({
    where: { id },
    data: { title, description, price: parsedPrice },
    select: { id: true, title: true, description: true, price: true },
  });

  return NextResponse.json(updated, { status: 200 });
});

export const DELETE = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const businessProfile = await resolveBusinessProfile(req.auth.user.id);

  if (!businessProfile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.serviceType.findFirst({
    where: { id, businessProfileId: businessProfile.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tipo de turno no encontrado" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];

  const activeBookings = await prisma.booking.count({
    where: {
      status: { in: ["pending", "confirmed"] },
      appointment: {
        serviceTypeId: id,
        date: { gte: today },
      },
    },
  });

  if (activeBookings > 0) {
    return NextResponse.json(
      { error: "No podés eliminar este tipo de turno porque tiene reservas futuras. Cancelalas primero." },
      { status: 409 }
    );
  }

  await prisma.serviceType.delete({ where: { id } });

  return NextResponse.json({ success: true }, { status: 200 });
});
