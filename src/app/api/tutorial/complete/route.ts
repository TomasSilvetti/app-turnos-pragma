import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const updated = await prisma.serviceProvider.update({
    where: { id: session.user.id },
    data: { tutorialCompleted: true },
    select: { tutorialCompleted: true },
  });

  return NextResponse.json(updated);
}
