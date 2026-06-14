import { NextRequest, NextResponse } from "next/server";
import { recoverDevice } from "@/lib/notas/device";

// POST { phrase }: recupera el deviceId asociado a una frase de recuperación.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.phrase !== "string") {
    return NextResponse.json({ error: "Falta la frase de recuperación" }, { status: 400 });
  }

  const device = await recoverDevice(body.phrase);
  if (!device) {
    return NextResponse.json({ error: "No encontramos notas con esa frase" }, { status: 404 });
  }
  return NextResponse.json(device);
}
