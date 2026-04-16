import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isActive: false }, { status: 401 });
  }

  const provider = await prisma.serviceProvider.findUnique({
    where: { id: session.user.id as string },
    select: { isActive: true },
  });

  return NextResponse.json({ isActive: provider?.isActive ?? false });
}
