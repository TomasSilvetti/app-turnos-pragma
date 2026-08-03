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
  const bandejaId = form?.get("bandejaId");
  const promptId = form?.get("promptId");

  // Una imagen pegada en la bandeja todavía no pertenece a ningún ítem: cuelga
  // de la bandeja hasta que se confirme la ventana que la contiene.
  const esBandeja = typeof bandejaId === "string" && bandejaId.length > 0;
  if (!(file instanceof File) || (!esBandeja && typeof itemId !== "string")) {
    return NextResponse.json({ error: "Falta el archivo o el destino" }, { status: 400 });
  }

  if (esBandeja) {
    const bandeja = await prisma.trabajoBandeja.findUnique({
      where: { id: bandejaId },
      select: { deviceId: true },
    });
    if (bandeja?.deviceId !== deviceId) return noEncontrado();
  } else if (!(await itemDelDevice(itemId as string, deviceId))) {
    return noEncontrado();
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  // El prefijo por dueño es lo que hace barato el borrado en cascada y deja el
  // store legible cuando hay que mirarlo a mano.
  const carpeta = esBandeja ? `bandeja/${bandejaId}` : `trabajo/${itemId}`;
  const nombre = `${carpeta}/prompt-${Date.now().toString(36)}.${ext}`;

  const blob = await put(nombre, file, { access: "public", addRandomSuffix: true });

  const imagen = await prisma.trabajoImagen.create({
    data: {
      itemId: esBandeja ? null : (itemId as string),
      bandejaId: esBandeja ? bandejaId : null,
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
