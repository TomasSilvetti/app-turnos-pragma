import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveConsola, sinPin } from "@/lib/notas/consola";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

export const runtime = "nodejs";

// La vista viva de la pantalla de la máquina. Es UNA sola: sacar una nueva
// reemplaza la anterior.

// GET: la captura actual y si hay una pedida.
export async function GET(request: NextRequest) {
  const deviceId = (await resolveConsola(request)) ?? (await resolveHarness(request));
  if (!deviceId) return sinPin();

  const captura = await prisma.consolaCaptura.findUnique({ where: { deviceId } });
  return NextResponse.json({ captura });
}

// POST: el botón de la app pide una captura. La saca el carril, que corre en la
// máquina; acá sólo queda anotado el pedido.
export async function POST(request: NextRequest) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();

  const existente = await prisma.consolaCaptura.findUnique({ where: { deviceId } });
  const captura = existente
    ? await prisma.consolaCaptura.update({
        where: { deviceId },
        data: { estado: "pendiente", pedidaEn: new Date() },
      })
    : await prisma.consolaCaptura.create({
        data: { deviceId, url: "", pathname: "", estado: "pendiente", pedidaEn: new Date() },
      });

  return NextResponse.json({ captura });
}

// PUT (multipart): el carril sube la captura que sacó.
//
// Borra la anterior del store en la misma pasada: si no, una tarde de uso deja
// cien imágenes pagando storage para mirar una sola.
export async function PUT(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const anterior = await prisma.consolaCaptura.findUnique({ where: { deviceId } });

  const blob = await put(`consola/${deviceId}/pantalla.webp`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const datos = {
    url: blob.url,
    pathname: blob.pathname,
    ancho: Number(form?.get("ancho") ?? 0) || 0,
    alto: Number(form?.get("alto") ?? 0) || 0,
    estado: "lista",
    pedidaEn: null,
  };

  const captura = anterior
    ? await prisma.consolaCaptura.update({ where: { deviceId }, data: datos })
    : await prisma.consolaCaptura.create({ data: { deviceId, ...datos } });

  // Recién después de guardar la nueva: si el del() fallara antes, quedaría la
  // fila apuntando a un blob borrado y la pantalla en blanco.
  if (anterior?.url) {
    try {
      await del(anterior.url);
    } catch {
      // Un blob que ya no está no es motivo para fallar la captura nueva.
    }
  }

  return NextResponse.json({ captura });
}
