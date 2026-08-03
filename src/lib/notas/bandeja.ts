// Operaciones sobre el documento crudo de la bandeja.
//
// Una sugerencia no guarda texto: guarda a qué bloques apunta (`desdeBid` ..
// `hastaBid`). Todo lo que hace falta para pasar de eso a un ítem —recortar el
// rango, sacarlo del crudo, juntar sus imágenes— vive acá.

export type NodoDoc = {
  type: string;
  attrs?: Record<string, unknown> | null;
  content?: NodoDoc[];
  text?: string;
  marks?: unknown[];
};

export type DocTiptap = { type: "doc"; content?: NodoDoc[] };

export const DOC_VACIO: DocTiptap = { type: "doc", content: [{ type: "paragraph" }] };

export function bloquesDe(doc: DocTiptap | null | undefined): NodoDoc[] {
  return Array.isArray(doc?.content) ? doc.content : [];
}

export function bidDe(nodo: NodoDoc): string | null {
  const v = nodo.attrs?.bid;
  return typeof v === "string" && v ? v : null;
}

// Devuelve [inicio, fin] como índices, o null si alguno de los bids ya no está
// (pasa si el bloque se borró editando el crudo después de analizar).
export function rangoDe(bloques: NodoDoc[], desdeBid: string, hastaBid: string): [number, number] | null {
  const i = bloques.findIndex((b) => bidDe(b) === desdeBid);
  const j = bloques.findIndex((b) => bidDe(b) === hastaBid);
  if (i < 0 || j < 0) return null;
  return i <= j ? [i, j] : [j, i];
}

export function recortarRango(doc: DocTiptap, desdeBid: string, hastaBid: string): DocTiptap | null {
  const bloques = bloquesDe(doc);
  const rango = rangoDe(bloques, desdeBid, hastaBid);
  if (!rango) return null;
  return { type: "doc", content: bloques.slice(rango[0], rango[1] + 1) };
}

// El crudo sin esos bloques. Si queda vacío se devuelve un párrafo suelto: un
// documento de Tiptap sin contenido rompe al montar el editor.
export function quitarRango(doc: DocTiptap, desdeBid: string, hastaBid: string): DocTiptap {
  const bloques = bloquesDe(doc);
  const rango = rangoDe(bloques, desdeBid, hastaBid);
  if (!rango) return doc;
  const resto = [...bloques.slice(0, rango[0]), ...bloques.slice(rango[1] + 1)];
  return resto.length > 0 ? { type: "doc", content: resto } : DOC_VACIO;
}

function recolectar(nodo: NodoDoc, salida: NodoDoc[], tipo: string): void {
  if (nodo.type === tipo) salida.push(nodo);
  for (const hijo of nodo.content ?? []) recolectar(hijo, salida, tipo);
}

export function imagenesDe(nodos: NodoDoc[]): string[] {
  const encontradas: NodoDoc[] = [];
  for (const n of nodos) recolectar(n, encontradas, "notaImage");
  return encontradas
    .map((n) => (typeof n.attrs?.src === "string" ? (n.attrs.src as string) : ""))
    .filter(Boolean);
}

export function imagenesEnRango(doc: DocTiptap, desdeBid: string, hastaBid: string): string[] {
  const recorte = recortarRango(doc, desdeBid, hastaBid);
  return recorte ? imagenesDe(bloquesDe(recorte)) : [];
}

function textoPlano(nodo: NodoDoc): string {
  if (nodo.type === "text") return nodo.text ?? "";
  if (nodo.type === "notaImage") return "[IMAGEN]";
  return (nodo.content ?? []).map(textoPlano).join("");
}

// El crudo tal como lo lee la sesión que itemiza: un bloque por línea, con su
// bid adelante. La sesión sólo tiene que devolver los límites de cada ítem, así
// que no necesita ver el texto formateado ni repetirlo en su respuesta.
export function aplanarConMarcas(doc: DocTiptap): { texto: string; imagenes: { bid: string; url: string }[] } {
  const lineas: string[] = [];
  const imagenes: { bid: string; url: string }[] = [];

  for (const bloque of bloquesDe(doc)) {
    const bid = bidDe(bloque);
    if (!bid) continue;

    const propias = imagenesDe([bloque]);
    for (const url of propias) imagenes.push({ bid, url });

    const texto = textoPlano(bloque).trim();
    const prefijo = bloque.type === "heading" ? "# " : bloque.type === "listItem" ? "- " : "";
    lineas.push(`[${bid}] ${prefijo}${texto || (propias.length ? "(captura)" : "")}`.trimEnd());
  }

  return { texto: lineas.join("\n"), imagenes };
}

// Título de fallback cuando la sesión no propuso uno: la primera línea con
// texto del rango, recortada. Es mejor que "Sin título" y se puede editar.
export function tituloTentativo(doc: DocTiptap, desdeBid: string, hastaBid: string): string {
  const recorte = recortarRango(doc, desdeBid, hastaBid);
  for (const b of bloquesDe(recorte ?? DOC_VACIO)) {
    const t = textoPlano(b).trim();
    if (t) return t.length > 70 ? `${t.slice(0, 67)}…` : t;
  }
  return "";
}
