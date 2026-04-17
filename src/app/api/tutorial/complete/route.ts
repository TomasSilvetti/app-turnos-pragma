import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


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
