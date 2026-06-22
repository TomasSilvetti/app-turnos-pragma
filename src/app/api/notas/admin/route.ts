import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = "6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const devices = await prisma.notaDevice.findMany({
    select: {
      id: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { notas: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    total: devices.length,
    devices: devices.map((d) => ({
      id: d.id,
      hasPassword: Boolean(d.passwordHash),
      notaCount: d._count.notas,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });
}
