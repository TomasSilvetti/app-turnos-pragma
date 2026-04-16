import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const tipo = body?.tipo as string | undefined;

  if (tipo !== "turnos-reservados" && tipo !== "reprogramaciones") {
    return NextResponse.json({ error: "Parámetro tipo inválido" }, { status: 400 });
  }

  const serviceProviderId = session.user.id;

  // Idempotencia: si ya existen turnos tutorial para este usuario, no crear duplicados
  const existing = await prisma.appointment.findFirst({
    where: { serviceProviderId, isTutorial: true },
  });

  if (existing) {
    return NextResponse.json({ ok: true, created: false });
  }

  const today = new Date().toISOString().split("T")[0];

  if (tipo === "turnos-reservados") {
    const mockData = [
      { time: "10:00", clientName: "Ana García", clientPhone: "1111111111", status: "pending" as const },
      { time: "11:00", clientName: "Carlos Rodríguez", clientPhone: "2222222222", status: "pending" as const },
      { time: "12:00", clientName: "María López", clientPhone: "3333333333", status: "confirmed" as const },
    ];

    for (const mock of mockData) {
      await prisma.appointment.create({
        data: {
          date: today,
          time: mock.time,
          serviceProviderId,
          isTutorial: true,
          booking: {
            create: {
              clientName: mock.clientName,
              clientPhone: mock.clientPhone,
              status: mock.status,
            },
          },
        },
      });
    }
  } else {
    await prisma.appointment.create({
      data: {
        date: today,
        time: "10:00",
        serviceProviderId,
        isTutorial: true,
        booking: {
          create: {
            clientName: "Juan Pérez",
            clientPhone: "4444444444",
            status: "requires_reschedule",
          },
        },
      },
    });
  }

  return NextResponse.json({ ok: true, created: true });
}
