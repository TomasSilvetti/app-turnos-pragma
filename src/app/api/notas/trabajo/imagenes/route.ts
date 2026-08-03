import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { itemDelDevice, noAutorizado, noEncontrado } from "@/lib/notas/trabajo";

export const runtime = "nodejs";

// POST (multipart): sube al store una imagen del prompt de trabajo y devuelve su
// URL. Va como archivo y no como data URL adentro del documento —que es lo que
// hace el editor de notas— porque el prompt del harness puede llevar varias
// capturas y el JSON viajaría en cada tecleo del autosave.
//
// El puente del harness NO pasa por acá: sube directo al store con su propio
// token, así una noche de capturas no atraviesa una función serverless.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const itemId = form?.get("itemId");
  const promptId = form?.get("promptId");

  if (!(file instanceof File) || typeof itemId !== "string") {
    return NextResponse.json({ error: "Falta el archivo o el ítem" }, { status: 400 });
  }
  if (!(await itemDelDevice(itemId, deviceId))) return noEncontrado();

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  // El prefijo por ítem es lo que hace barato el borrado en cascada y deja el
  // store legible cuando hay que mirarlo a mano.
  const nombre = `trabajo/${itemId}/prompt-${Date.now().toString(36)}.${ext}`;

  const blob = await put(nombre, file, { access: "public", addRandomSuffix: true });

  const imagen = await prisma.trabajoImagen.create({
    data: {
      itemId,
      promptId: typeof promptId === "string" && promptId ? promptId : null,
      url: blob.url,
      pathname: blob.pathname,
      ancho: Number(form?.get("ancho") ?? 0) || 0,
      alto: Number(form?.get("alto") ?? 0) || 0,
      bytes: file.size,
    },
    select: { id: true, url: true, ancho: true, alto: true },
  });

  return NextResponse.json({ imagen }, { status: 201 });
}
