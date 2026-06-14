import { NextRequest, NextResponse } from "next/server";
import { recoverDevice } from "@/lib/notas/device";

// POST { password }: recupera el deviceId asociado a una contraseña.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "Falta la contraseña" }, { status: 400 });
  }

  const device = await recoverDevice(body.password);
  if (!device) {
    return NextResponse.json({ error: "No encontramos notas con esa contraseña" }, { status: 404 });
  }
  return NextResponse.json(device);
}
