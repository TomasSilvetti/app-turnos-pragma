import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceProviderId = session.user.id;

  const count = await prisma.booking.count({
    where: {
      status: "requires_reschedule",
      appointment: { serviceProviderId },
    },
  });

  return NextResponse.json({ count }, { status: 200 });
}
