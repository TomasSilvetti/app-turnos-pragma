// Itemizar un archivo de la notebook: convertir lo que devuelve la sesión en el
// prompt de un ítem.
//
// La diferencia con la bandeja está toda acá. Una sugerencia de bandeja no trae
// texto —apunta a bloques del crudo, que ya está en la app—; un ítem que sale de
// un informe SÍ trae texto, porque el informe vive en la notebook y la app nunca
// lo vio. Lo que no trae es el informe entero: el prompt dice qué hacer y apunta
// a su ancla, y la sesión que ejecute la tarea abre el archivo si necesita más.

import { randomUUID } from "crypto";

type Nodo = { type: string; attrs?: Record<string, unknown>; content?: Nodo[]; text?: string };

export type ImagenSubida = {
  url: string;
  pathname: string;
  ancho?: number;
  alto?: number;
  bytes?: number;
};

export type ItemEntrante = {
  titulo: string;
  proyecto: string;
  prompt: string;
  fuenteArchivo: string;
  fuenteAncla: string;
  imagenes: ImagenSubida[];
};

function texto(t: string): Nodo[] {
  // Tiptap no acepta un nodo de texto vacío: un párrafo sin `content` es la
  // forma de escribir una línea en blanco.
  return t ? [{ type: "text", text: t }] : [];
}

// Texto plano a documento de Tiptap. Se soportan encabezados y viñetas y nada
// más: el prompt lo escribe un modelo al que se le pidió prosa corta, y cuanto
// más chico el vocabulario, menos formas hay de que devuelva algo que el editor
// no sepa montar.
export function textoADoc(plano: string): { type: "doc"; content: Nodo[] } {
  const content: Nodo[] = [];
  let vinetas: Nodo[] | null = null;

  const cerrarLista = () => {
    if (vinetas) {
      content.push({ type: "bulletList", content: vinetas });
      vinetas = null;
    }
  };

  for (const cruda of (plano || "").replace(/\r\n/g, "\n").split("\n")) {
    const linea = cruda.trim();

    const vineta = linea.match(/^[-*•]\s+(.*)$/);
    if (vineta) {
      const item: Nodo = { type: "listItem", content: [{ type: "paragraph", content: texto(vineta[1]) }] };
      if (vinetas) vinetas.push(item);
      else vinetas = [item];
      continue;
    }

    cerrarLista();
    if (!linea) continue;

    const titulo = linea.match(/^(#{1,6})\s+(.*)$/);
    if (titulo) {
      content.push({
        type: "heading",
        attrs: { level: Math.min(6, titulo[1].length + 2) },
        content: texto(titulo[2]),
      });
      continue;
    }

    content.push({ type: "paragraph", content: texto(linea) });
  }

  cerrarLista();
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

// La línea que convierte un prompt en algo que la sesión puede ampliar sola. Va
// PRIMERO y no al final: si la sesión corta la lectura del prompt, lo que no
// puede perderse es dónde está el resto del contexto.
export function encabezadoDeFuente(archivo: string, ancla: string): Nodo[] {
  if (!archivo) return [];
  const donde = ancla ? `${archivo}${ancla.startsWith("#") ? ancla : `#${ancla}`}` : archivo;
  return [
    {
      type: "paragraph",
      content: [
        { type: "text", text: `Contexto completo: ${donde}` },
      ],
    },
  ];
}

// El documento final del prompt: fuente, texto, y las capturas al final. Las
// imágenes van como nodos del documento igual que si las hubieras pegado vos, y
// por eso llevan la misma forma que inserta el editor (imgId + src + width).
export function docDeItem(item: ItemEntrante): { type: "doc"; content: Nodo[] } {
  const cuerpo = textoADoc(item.prompt);
  const imagenes: Nodo[] = item.imagenes.map((img) => ({
    type: "notaImage",
    attrs: { imgId: randomUUID(), src: img.url, width: 100 },
  }));
  return {
    type: "doc",
    content: [...encabezadoDeFuente(item.fuenteArchivo, item.fuenteAncla), ...cuerpo.content, ...imagenes],
  };
}

function cadena(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Valida lo que subió el puente. Un ítem sin título o sin prompt no se descarta
// en silencio: se cuenta como descartado y el pedido lo dice, o el usuario ve
// trece ítems donde el informe tenía quince y no hay forma de saber por qué.
export function normalizarItems(crudo: unknown): { items: ItemEntrante[]; descartados: number } {
  const lista = Array.isArray(crudo) ? crudo : [];
  const items: ItemEntrante[] = [];
  let descartados = 0;

  for (const e of lista) {
    const fila = e as Record<string, unknown>;
    const fuente = (fila.fuente ?? {}) as Record<string, unknown>;
    const titulo = cadena(fila.titulo, 200);
    const prompt = cadena(fila.prompt, 20000);
    if (!titulo || !prompt) {
      descartados++;
      continue;
    }
    const imagenes = (Array.isArray(fila.imagenes) ? fila.imagenes : [])
      .map((i) => i as Record<string, unknown>)
      .filter((i) => typeof i.url === "string" && typeof i.pathname === "string")
      .map((i) => ({
        url: i.url as string,
        pathname: i.pathname as string,
        ancho: Number(i.ancho) || 0,
        alto: Number(i.alto) || 0,
        bytes: Number(i.bytes) || 0,
      }));

    items.push({
      titulo,
      proyecto: cadena(fila.proyecto, 60),
      prompt,
      fuenteArchivo: cadena(fuente.archivo ?? fila.fuenteArchivo, 400),
      fuenteAncla: cadena(fuente.ancla ?? fila.fuenteAncla, 120),
      imagenes,
    });
  }

  return { items, descartados };
}
