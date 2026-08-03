import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "./device";

// Piezas comunes de la sección Trabajo. Hay dos clientes con permisos distintos:
// el navegador (device anónimo, como el resto de notas) y el puente del harness,
// que corre fuera del navegador y por eso necesita además un token compartido.

export const ESTADOS = ["pendiente", "en_curso", "pausada", "bloqueado", "completado"] as const;
export type EstadoItem = (typeof ESTADOS)[number];

export const CARRILES = ["trabajo", "itemizacion"] as const;
export type Carril = (typeof CARRILES)[number];

export function esCarril(v: unknown): v is Carril {
  return typeof v === "string" && CARRILES.includes(v as Carril);
}

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
//
// Un mismo blob puede estar referenciado más de una vez: al confirmar una
// sugerencia, la imagen que estaba en la bandeja se copia al ítem conservando el
// `pathname`. Por eso sólo se borra del store el que no le queda a nadie más;
// si no, borrar el ítem dejaría a la bandeja mostrando una imagen rota.
export async function borrarImagenesDeItem(itemId: string): Promise<number> {
  const imagenes = await prisma.trabajoImagen.findMany({
    where: { itemId },
    select: { url: true, pathname: true },
  });
  if (imagenes.length === 0) return 0;

  const sinDuenio: string[] = [];
  for (const img of imagenes) {
    const otras = await prisma.trabajoImagen.count({
      where: { pathname: img.pathname, itemId: { not: itemId } },
    });
    if (otras === 0) sinDuenio.push(img.url);
  }

  if (sinDuenio.length > 0) {
    try {
      await del(sinDuenio);
    } catch {
      // Un blob que ya no está, o un corte de red, no debe impedir borrar el
      // ítem: lo contrario deja un ítem que no se puede eliminar nunca.
    }
  }
  return sinDuenio.length;
}

// Estado del harness listo para la UI: un carril por cada proceso, con el latido
// ya evaluado, más las cuentas.
export async function estadoHarness(deviceId: string) {
  const [filas, cuentas] = await Promise.all([
    prisma.harnessEstado.findMany({
      where: { deviceId },
      include: { itemEnCurso: { select: { id: true, titulo: true, pasoActual: true, pasosTotales: true, intentos: true } } },
    }),
    prisma.harnessCuenta.findMany({ where: { deviceId }, orderBy: { nombre: "asc" } }),
  ]);

  const carriles = CARRILES.map((carril) => {
    const fila = filas.find((f) => f.carril === carril);
    const vivo = Boolean(fila && Date.now() - fila.actualizadoAt.getTime() < LATIDO_VENCE_MS);
    return {
      carril,
      vivo,
      // Lo que pediste desde el botón, que puede no coincidir todavía con lo que
      // pasa: entre encenderlo y que el vigía lo levante hay unos segundos.
      encendido: fila?.encendido ?? false,
      estado: vivo ? fila!.estado : "detenido",
      itemEnCurso: vivo ? fila!.itemEnCurso : null,
      sesionInicio: vivo ? fila!.sesionInicio : null,
      cuentaActual: vivo ? fila!.cuentaActual : null,
      limiteSesionMin: fila?.limiteSesionMin ?? 90,
      actualizadoAt: fila?.actualizadoAt ?? null,
    };
  });

  const trabajo = carriles[0];
  return {
    carriles,
    cuentas,
    // Resumen plano del carril de trabajo, que es lo que ya consumen las
    // pantallas que sólo quieren saber si el harness está vivo.
    vivo: carriles.some((c) => c.vivo),
    estado: trabajo.estado,
    itemEnCurso: trabajo.itemEnCurso,
    sesionInicio: trabajo.sesionInicio,
    cuentaActual: trabajo.cuentaActual,
    limiteSesionMin: trabajo.limiteSesionMin,
    actualizadoAt: carriles.map((c) => c.actualizadoAt).filter(Boolean).sort().pop() ?? null,
  };
}
