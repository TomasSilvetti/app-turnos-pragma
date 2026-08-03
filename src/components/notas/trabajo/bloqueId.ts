import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// Le pone un id estable a cada bloque del documento crudo de la bandeja.
//
// Las sugerencias se guardan como un rango `desdeBid..hastaBid`. Si eso fueran
// índices, confirmar una ventana —que saca bloques del medio— correría todas las
// de abajo, y agregar un párrafo arriba las rompería todas a la vez, en
// silencio. Con ids, mover un borde es cambiar un string y nada más se entera.
//
// El id también viaja al DOM como `data-bid`: es lo que usa el overlay para
// medir dónde dibujar cada ventana.

const TIPOS = ["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "notaImage"];

function nuevoBid(): string {
  return `b${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
}

export const BloqueId = Extension.create({
  name: "bloqueId",

  addGlobalAttributes() {
    return [
      {
        types: TIPOS,
        attributes: {
          bid: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-bid"),
            renderHTML: (attributes) => (attributes.bid ? { "data-bid": attributes.bid } : {}),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("bloqueId"),
        // Los ids se asignan al vuelo: un bloque nuevo (Enter, pegar) nace sin
        // bid y se lo pone acá. Sólo se miran los nodos de primer nivel, que son
        // los que el overlay puede medir y el usuario puede encasillar.
        appendTransaction: (transacciones, _viejo, nuevo) => {
          if (!transacciones.some((t) => t.docChanged)) return null;

          const tr = nuevo.tr;
          const usados = new Set<string>();
          let cambio = false;

          nuevo.doc.forEach((nodo, pos) => {
            if (!TIPOS.includes(nodo.type.name)) return;
            const actual = nodo.attrs.bid as string | null;
            // Pegar un bloque copiado trae el bid del original: si se dejara,
            // dos bloques distintos responderían al mismo id y la ventana se
            // dibujaría sobre el equivocado.
            if (!actual || usados.has(actual)) {
              const bid = nuevoBid();
              usados.add(bid);
              tr.setNodeAttribute(pos, "bid", bid);
              cambio = true;
            } else {
              usados.add(actual);
            }
          });

          return cambio ? tr : null;
        },
      }),
    ];
  },
});
