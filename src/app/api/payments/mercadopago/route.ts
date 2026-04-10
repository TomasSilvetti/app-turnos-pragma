import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/../auth";

export async function POST(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({ error: "mp_not_connected" }, { status: 400 });
}
