"use client";

// Las imágenes de las notas se guardan como data URL dentro del JSON del
// contenido: así el espejo local (offline) sigue funcionando sin storage aparte.
// Por eso todo se comprime antes de insertar.

export const MAX_DIMENSION = 1600;
export const CALIDAD = 0.82;

export type Recorte = { x: number; y: number; w: number; h: number };

export function esImagen(file: File): boolean {
  return file.type.startsWith("image/");
}

export function leerArchivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

// WebP conserva transparencia (capturas de pantalla) y pesa menos que PNG.
// Si el navegador no lo soporta, el toDataURL devuelve PNG y lo pasamos a JPEG.
function exportar(canvas: HTMLCanvasElement, calidad: number): string {
  const webp = canvas.toDataURL("image/webp", calidad);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", calidad);
}

function dibujar(img: CanvasImageSource, w: number, h: number, sx = 0, sy = 0, sw = w, sh = h): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

// Reescala al lado mayor permitido y recomprime.
export async function comprimirImagen(
  src: string,
  maxDimension = MAX_DIMENSION,
  calidad = CALIDAD
): Promise<string> {
  const img = await cargarImagen(src);
  const escala = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const w = img.naturalWidth * escala;
  const h = img.naturalHeight * escala;
  return exportar(dibujar(img, w, h, 0, 0, img.naturalWidth, img.naturalHeight), calidad);
}

// El recorte llega en fracciones (0–1) del tamaño natural para no depender del
// tamaño con el que se mostró la imagen en el modal.
export async function recortarImagen(src: string, recorte: Recorte, calidad = CALIDAD): Promise<string> {
  const img = await cargarImagen(src);
  const sx = Math.round(recorte.x * img.naturalWidth);
  const sy = Math.round(recorte.y * img.naturalHeight);
  const sw = Math.max(1, Math.round(recorte.w * img.naturalWidth));
  const sh = Math.max(1, Math.round(recorte.h * img.naturalHeight));
  return exportar(dibujar(img, sw, sh, sx, sy, sw, sh), calidad);
}

export async function archivoAImagenComprimida(file: File): Promise<string> {
  return comprimirImagen(await leerArchivo(file));
}

export function pesoAproximadoKb(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 0.75) / 1024);
}

// ── Imágenes pegadas o arrastradas ──
// Una captura de Windows (Win+Shift+S, ImprPant) no pone un archivo en el
// portapapeles sino un bitmap crudo: `files` queda vacío y la imagen aparece
// sólo en `items`. Por eso `items` va primero y `files` queda de complemento
// para lo copiado desde el explorador.
export function imagenesDelEvento(dt: DataTransfer | null | undefined): File[] {
  if (!dt) return [];
  const deItems: File[] = [];
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) deItems.push(file);
  }
  if (deItems.length > 0) return deItems;
  return Array.from(dt.files ?? []).filter(esImagen);
}

// La Herramienta de Recortes publica la captura como bitmap + un HTML que
// apunta a un PNG temporal en disco: ahí no hay File que sacar del evento y hay
// que ir a leer el portapapeles aparte.
function pareceImagenPegada(dt: DataTransfer | null | undefined): boolean {
  if (!dt) return false;
  if (Array.from(dt.types ?? []).some((t) => t.startsWith("image/"))) return true;
  if (dt.getData("text/plain").trim()) return false;
  return /<img\b/i.test(dt.getData("text/html"));
}

// Último recurso: la Async Clipboard API sí entrega el bitmap. Pide permiso de
// lectura, así que sólo se llama cuando el evento no trajo ningún archivo.
async function imagenesDelPortapapeles(): Promise<File[]> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) return [];
  try {
    const files: File[] = [];
    for (const item of await navigator.clipboard.read()) {
      const tipo = item.types.find((t) => t.startsWith("image/"));
      if (!tipo) continue;
      const blob = await item.getType(tipo);
      files.push(new File([blob], `captura.${tipo.split("/")[1] || "png"}`, { type: tipo }));
    }
    return files;
  } catch {
    return [];
  }
}

// Devuelve true si el pegado era de imágenes y quedó atendido: quien llama corta
// ahí el pegado normal. El camino del portapapeles es asincrónico, así que las
// imágenes pueden llegar al callback un tick después.
export function manejarPegadoDeImagenes(
  dt: DataTransfer | null | undefined,
  onImagenes: (files: File[]) => void
): boolean {
  const inmediatas = imagenesDelEvento(dt);
  if (inmediatas.length > 0) {
    onImagenes(inmediatas);
    return true;
  }
  if (!pareceImagenPegada(dt)) return false;
  imagenesDelPortapapeles().then((files) => {
    if (files.length > 0) onImagenes(files);
  });
  return true;
}
