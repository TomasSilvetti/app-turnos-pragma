import { NextRequest, NextResponse } from "next/server";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { escanearComanda } from "@/lib/lavanderia/ia";

export const maxDuration = 60;

const TIPOS: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

// POST (multipart, campo "foto"): procesa la imagen del ticket con Claude y
// devuelve un preview (NO crea la OT). El empleado confirma/corrige y luego
// hace POST /api/lavanderia/ots para crearla.
export async function POST(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const archivo = form?.get("foto");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
  }

  const mediaType = TIPOS[archivo.type];
  if (!mediaType) {
    return NextResponse.json({ error: "Formato no soportado (usá JPG, PNG o WebP)" }, { status: 400 });
  }

  const base64 = Buffer.from(await archivo.arrayBuffer()).toString("base64");

  try {
    const ot = await escanearComanda(base64, mediaType);
    return NextResponse.json({ ot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo procesar la imagen";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
