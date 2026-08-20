import { NextRequest, NextResponse } from "next/server";
import { resolveDeviceId } from "@/lib/notas/device";
import { claveCorrecta, firmarToken, usaTotp } from "@/lib/notas/consola";
import { noAutorizado } from "@/lib/notas/trabajo";

// Espera fija ante un PIN equivocado. Sin esto, un PIN de cuatro dígitos se
// prueba entero en segundos.
const CASTIGO_MS = 1500;

// GET: qué pide la puerta. La pantalla de ingreso no puede adivinarlo sola y la
// diferencia importa: un PIN se guarda en el llavero, un código de seis dígitos
// se lee del teléfono cada vez.
export async function GET() {
  return NextResponse.json({
    modo: usaTotp() ? "totp" : "pin",
    configurada: usaTotp() || Boolean(process.env.CONSOLA_PIN),
  });
}

export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  if (!usaTotp() && !process.env.CONSOLA_PIN) {
    return NextResponse.json(
      { error: "La consola no está configurada: falta CONSOLA_PIN o CONSOLA_TOTP_SECRET en el servidor." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  // `codigo` es el nombre nuevo; `pin` sigue aceptándose para no romper una
  // pestaña vieja que quedó abierta con el JS anterior.
  if (!claveCorrecta(body?.codigo ?? body?.pin)) {
    await new Promise((r) => setTimeout(r, CASTIGO_MS));
    return NextResponse.json(
      { error: usaTotp() ? "Código incorrecto" : "PIN incorrecto" },
      { status: 403 }
    );
  }

  return NextResponse.json({ token: firmarToken(deviceId) });
}
