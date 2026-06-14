import { NextRequest, NextResponse } from "next/server";
import { createDevice, deviceHasPassword, resolveDeviceId } from "@/lib/notas/device";

// POST: crea un device anónimo nuevo y devuelve su id.
export async function POST() {
  const device = await createDevice();
  return NextResponse.json(device, { status: 201 });
}

// GET: indica si el device actual ya tiene contraseña de recuperación definida.
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "Device no encontrado" }, { status: 401 });

  const hasPassword = await deviceHasPassword(deviceId);
  return NextResponse.json({ hasPassword });
}
