import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveConsola, sesionDelDevice, sinPin } from "@/lib/notas/consola";
import { noEncontrado } from "@/lib/notas/trabajo";

export const runtime = "nodejs";

// POST (multipart): sube al store una imagen pegada/adjuntada en la consola y
// devuelve su URL. Se guarda en `ConsolaMensaje.imagenes` recién al mandar el
// mensaje, así que acá sólo se sube el archivo.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;
  if (!(await sesionDelDevice(id, deviceId))) return noEncontrado();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const nombre = `consola/${id}/adjunto-${Date.now().toString(36)}.${ext}`;
  const blob = await put(nombre, file, { access: "public", addRandomSuffix: true });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
