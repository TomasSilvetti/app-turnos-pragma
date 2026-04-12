import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      name: true,
      logoUrl: true,
      address: true,
      phone: true,
      cbu: true,
      alias: true,
      theme: true,
      brandColor: true,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}
