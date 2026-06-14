import { NextRequest, NextResponse } from "next/server";
import { resolveDeviceId, setDevicePassword } from "@/lib/notas/device";
import { MIN_PASSWORD_LENGTH } from "@/lib/notas/password";

// POST { password }: define o actualiza la contraseña de recuperación del device actual.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "Device no encontrado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "Falta la contraseña" }, { status: 400 });
  }

  const result = await setDevicePassword(deviceId, body.password);
  if (!result.ok) {
    if (result.error === "invalid") {
      return NextResponse.json(
        { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, code: "invalid" },
        { status: 400 },
      );
    }
    if (result.error === "taken") {
      return NextResponse.json(
        { error: "Esa contraseña ya está en uso. Elegí otra.", code: "taken" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Device no encontrado", code: "not_found" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
