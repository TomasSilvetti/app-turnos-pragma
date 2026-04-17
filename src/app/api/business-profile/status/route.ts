import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: { slug: true },
  });

  if (!profile) {
    return NextResponse.json({ hasProfile: false });
  }

  return NextResponse.json({ hasProfile: true, slug: profile.slug });
}
