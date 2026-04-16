import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import { z } from "zod";

const prisma = new PrismaClient();

const createExpenseSchema = z.object({
  descripcion: z.string().trim().min(1, "La descripción es requerida"),
  monto: z.number().positive("El monto debe ser mayor a 0"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceProviderId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { descripcion, monto } = parsed.data;

  const provider = await prisma.serviceProvider.findUnique({
    where: { id: serviceProviderId },
    select: { id: true },
  });

  if (!provider) {
    return NextResponse.json(
      { error: "Proveedor no encontrado. Cerrá sesión y volvé a iniciarla." },
      { status: 404 }
    );
  }

  const expense = await prisma.expense.create({
    data: { descripcion, monto, serviceProviderId },
    select: { id: true, descripcion: true, monto: true, createdAt: true },
  });

  return NextResponse.json(
    {
      success: true,
      expense: {
        id: expense.id,
        descripcion: expense.descripcion,
        monto: Number(expense.monto),
        createdAt: expense.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { serviceProviderId: true },
  });

  if (!expense) {
    return NextResponse.json({ error: "Egreso no encontrado" }, { status: 404 });
  }

  if (expense.serviceProviderId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
