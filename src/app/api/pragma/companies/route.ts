import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifySessionToken, PRAGMA_COOKIE } from "@/lib/pragma-auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const token = request.cookies.get(PRAGMA_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const companies = await prisma.businessProfile.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      rubro: true,
      address: true,
      phone: true,
      createdAt: true,
      serviceProvider: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ companies });
}
