import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lavanderia/empleado";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ admin });
}
