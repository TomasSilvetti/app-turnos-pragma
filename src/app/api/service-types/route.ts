import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

export const GET = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceTypes = await prisma.serviceType.findMany({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true, title: true, description: true, price: true },
  });

  return NextResponse.json(serviceTypes, { status: 200 });
});

export const POST = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

  const serviceType = await prisma.serviceType.create({
    data: {
      title,
      description,
      price: parsedPrice,
      serviceProviderId: req.auth.user.id,
    },
    select: { id: true, title: true, description: true, price: true },
  });

  return NextResponse.json(serviceType, { status: 201 });
});
