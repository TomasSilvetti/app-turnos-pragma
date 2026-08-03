import { NextRequest, NextResponse } from "next/server";
import { resolveDeviceId } from "@/lib/notas/device";
import { firmarToken, pinCorrecto } from "@/lib/notas/consola";
import { noAutorizado } from "@/lib/notas/trabajo";

// Espera fija ante un PIN equivocado. Sin esto, un PIN de cuatro dígitos se
// prueba entero en segundos.
const CASTIGO_MS = 1500;

export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  if (!process.env.CONSOLA_PIN) {
    return NextResponse.json(
      { error: "La consola no está configurada: falta CONSOLA_PIN en el servidor." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (!pinCorrecto(body?.pin)) {
    await new Promise((r) => setTimeout(r, CASTIGO_MS));
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 403 });
  }

  return NextResponse.json({ token: firmarToken(deviceId) });
}
