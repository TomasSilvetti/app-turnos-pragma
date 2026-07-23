import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Crop, Maximize2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotaImageOptions = { onCrop: (imgId: string, src: string) => void };

// La toolbar vive fuera del editor (barra fija de la página): pide la inserción
// por evento en vez de atravesar props hasta el input de archivo.
export const INSERT_IMAGE_EVENT = "notas:insertar-imagen";

const ANCHO_MIN = 15;
const ANCHO_MAX = 100;

function NotaImageView({ node, updateAttributes, deleteNode, selected, extension, editor }: NodeViewProps) {
  const imgId = node.attrs.imgId as string;
  const src = node.attrs.src as string;
  const width = (node.attrs.width as number) || 100;
  const onCrop = (extension.options as NotaImageOptions).onCrop;

  const contenedor = useRef<HTMLDivElement | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [anchoPreview, setAnchoPreview] = useState<number | null>(null);
  const editable = editor.isEditable;

  const anchoActual = anchoPreview ?? width;

  // Redimensionado: se calcula el ancho como porcentaje del contenedor del
  // editor para que la imagen siga siendo responsive en celular.
  const iniciarResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const caja = contenedor.current?.parentElement;
      if (!caja) return;
      const anchoCaja = caja.getBoundingClientRect().width;
      const inicioX = e.clientX;
      const inicial = width;
      setArrastrando(true);

      const mover = (ev: PointerEvent) => {
        const delta = ((ev.clientX - inicioX) / anchoCaja) * 100;
        const siguiente = Math.round(Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, inicial + delta)));
        setAnchoPreview(siguiente);
      };
      const soltar = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        const delta = ((ev.clientX - inicioX) / anchoCaja) * 100;
        const final = Math.round(Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, inicial + delta)));
        setArrastrando(false);
        setAnchoPreview(null);
        // Se persiste una sola vez al soltar: durante el arrastre sólo hay preview
        // local, así no se dispara el autoguardado en cada movimiento.
        if (final !== inicial) updateAttributes({ width: final });
      };

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    },
    [width, updateAttributes]
  );

  useEffect(() => {
    if (!arrastrando) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = prev;
    };
  }, [arrastrando]);

  return (
    <NodeViewWrapper className="my-3">
      <div
        ref={contenedor}
        contentEditable={false}
        className="group relative inline-block max-w-full align-top"
        style={{ width: `${anchoActual}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={(node.attrs.alt as string) || ""}
          draggable={false}
          className={cn(
            "block h-auto w-full rounded-xl border transition-colors",
            selected ? "border-primary ring-2 ring-primary/40" : "border-border"
          )}
        />

        {editable && (
          <>
            <div
              className={cn(
                "absolute right-2 top-2 flex gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-lg backdrop-blur transition-opacity",
                selected || arrastrando ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onCrop(imgId, src)}
                aria-label="Recortar"
                title="Recortar"
                className="flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
              >
                <Crop className="size-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ width: 100 })}
                aria-label="Ancho completo"
                title="Ancho completo"
                className="flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
              >
                <Maximize2 className="size-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => deleteNode()}
                aria-label="Eliminar imagen"
                title="Eliminar imagen"
                className="flex size-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Manija de redimensionado (esquina inferior derecha) */}
            <div
              onPointerDown={iniciarResize}
              role="slider"
              aria-label="Redimensionar imagen"
              aria-valuenow={anchoActual}
              aria-valuemin={ANCHO_MIN}
              aria-valuemax={ANCHO_MAX}
              tabIndex={-1}
              className={cn(
                "absolute -bottom-1.5 -right-1.5 size-5 cursor-nwse-resize touch-none rounded-full border-2 border-card bg-primary shadow transition-opacity",
                selected || arrastrando ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            />

            {arrastrando && (
              <span className="absolute bottom-2 left-2 rounded-md bg-foreground/80 px-2 py-0.5 text-xs font-medium tabular-nums text-background">
                {anchoActual}%
              </span>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const NotaImage = Node.create<NotaImageOptions>({
  name: "notaImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { onCrop: () => {} };
  },

  addAttributes() {
    return {
      imgId: { default: null },
      src: { default: null },
      alt: { default: "" },
      width: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute("data-width")) || 100,
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[data-nota-image]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes({
        "data-nota-image": "",
        "data-img-id": HTMLAttributes.imgId,
        "data-width": HTMLAttributes.width,
        src: HTMLAttributes.src,
        alt: HTMLAttributes.alt,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NotaImageView);
  },
});
