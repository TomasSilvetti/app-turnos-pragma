import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { cashEnabled: true, transferEnabled: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const methods: string[] = [];
  if (profile.cashEnabled) methods.push("cash");
  if (profile.transferEnabled) methods.push("transfer");

  return NextResponse.json({ methods });
}
