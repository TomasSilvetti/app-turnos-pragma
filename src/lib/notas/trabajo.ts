import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "./device";

// Piezas comunes de la sección Trabajo. Hay dos clientes con permisos distintos:
// el navegador (device anónimo, como el resto de notas) y el puente del harness,
// que corre fuera del navegador y por eso necesita además un token compartido.

export const ESTADOS = ["pendiente", "en_curso", "bloqueado", "completado"] as const;
export type EstadoItem = (typeof ESTADOS)[number];

export const TIPOS_LOG = ["hito", "problema", "solucion", "bloqueo", "handoff"] as const;
export type TipoLog = (typeof TIPOS_LOG)[number];

export const DOC_VACIO = { type: "doc", content: [{ type: "paragraph" }] };

// El harness se considera vivo si latió hace menos de esto; pasado ese punto la
// UI lo muestra detenido. Dos minutos: el runner late cada 5 s, así que un solo
// latido perdido no debería apagar el cartel.
export const LATIDO_VENCE_MS = 2 * 60 * 1000;

export function noAutorizado() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function noEncontrado() {
  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

// El puente manda el mismo x-device-id que el navegador MÁS x-harness-token.
// Sin el token no puede escribir logs ni tomar la cola: el deviceId viaja en
// cada request desde el celular y no alcanza como credencial de escritura
// automatizada.
export async function resolveHarness(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("x-harness-token");
  const esperado = process.env.HARNESS_TOKEN;
  if (!esperado || !token || token !== esperado) return null;
  return resolveDeviceId(request);
}

export async function itemDelDevice(id: string, deviceId: string) {
  const item = await prisma.trabajoItem.findUnique({
    where: { id },
    select: { id: true, deviceId: true, estado: true, titulo: true },
  });
  return item && item.deviceId === deviceId ? item : null;
}

// Borra del store las imágenes de un ítem antes de borrar sus filas. El orden
// importa: si se borraran las filas primero y fallara el del(), quedarían blobs
// sin nadie que sepa que existen — imposibles de encontrar para limpiarlos.
export async function borrarImagenesDeItem(itemId: string): Promise<number> {
  const imagenes = await prisma.trabajoImagen.findMany({
    where: { itemId },
    select: { url: true },
  });
  if (imagenes.length === 0) return 0;
  try {
    await del(imagenes.map((i) => i.url));
  } catch {
    // Un blob que ya no está, o un corte de red, no debe impedir borrar el ítem:
    // lo contrario deja al usuario con un ítem que no se puede eliminar nunca.
  }
  return imagenes.length;
}

// Estado del harness listo para la UI, con el latido ya evaluado.
export async function estadoHarness(deviceId: string) {
  const [estado, cuentas] = await Promise.all([
    prisma.harnessEstado.findUnique({
      where: { deviceId },
      include: { itemEnCurso: { select: { id: true, titulo: true, pasoActual: true, pasosTotales: true, intentos: true } } },
    }),
    prisma.harnessCuenta.findMany({ where: { deviceId }, orderBy: { nombre: "asc" } }),
  ]);

  const vivo = Boolean(estado && Date.now() - estado.actualizadoAt.getTime() < LATIDO_VENCE_MS);
  return {
    vivo,
    estado: vivo ? estado!.estado : "detenido",
    itemEnCurso: vivo ? estado!.itemEnCurso : null,
    sesionInicio: vivo ? estado!.sesionInicio : null,
    cuentaActual: vivo ? estado!.cuentaActual : null,
    limiteSesionMin: estado?.limiteSesionMin ?? 90,
    actualizadoAt: estado?.actualizadoAt ?? null,
    cuentas,
  };
}
