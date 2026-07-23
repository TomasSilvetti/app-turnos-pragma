"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { recortarImagen, type Recorte } from "@/lib/notas/imagen";
import { cn } from "@/lib/utils";

const RECORTE_INICIAL: Recorte = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
const MIN = 0.05;

type Proporcion = { id: string; label: string; valor: number | null };

const PROPORCIONES: Proporcion[] = [
  { id: "libre", label: "Libre", valor: null },
  { id: "1:1", label: "1:1", valor: 1 },
  { id: "4:3", label: "4:3", valor: 4 / 3 },
  { id: "16:9", label: "16:9", valor: 16 / 9 },
];

type Esquina = "nw" | "ne" | "sw" | "se";

function limitar(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function ImageCropModal({
  open,
  src,
  onClose,
  onApply,
}: {
  open: boolean;
  src: string | null;
  onClose: () => void;
  onApply: (nuevoSrc: string) => void;
}) {
  const [recorte, setRecorte] = useState<Recorte>(RECORTE_INICIAL);
  const [proporcion, setProporcion] = useState<string>("libre");
  const [procesando, setProcesando] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) {
      setRecorte(RECORTE_INICIAL);
      setProporcion("libre");
    }
  }, [open, src]);

  // El aspecto se mide en píxeles reales de la imagen, no en fracciones, así que
  // hay que convertir usando la relación ancho/alto del elemento renderizado.
  const relacion = useCallback(() => {
    const el = imgRef.current;
    if (!el) return 1;
    const r = el.getBoundingClientRect();
    return r.height > 0 ? r.width / r.height : 1;
  }, []);

  const aplicarProporcion = useCallback(
    (id: string) => {
      setProporcion(id);
      const valor = PROPORCIONES.find((p) => p.id === id)?.valor;
      if (!valor) return;
      const rel = relacion();
      setRecorte((prev) => {
        // h en fracciones = w * (rel / valor)
        let w = prev.w;
        let h = (w * rel) / valor;
        if (h > 1) {
          h = 1;
          w = (h * valor) / rel;
        }
        const x = limitar(prev.x, 0, 1 - w);
        const y = limitar(prev.y, 0, 1 - h);
        return { x, y, w, h };
      });
    },
    [relacion]
  );

  const arrastrar = useCallback(
    (e: React.PointerEvent, modo: "mover" | Esquina) => {
      e.preventDefault();
      e.stopPropagation();
      const el = imgRef.current;
      if (!el) return;
      const caja = el.getBoundingClientRect();
      const inicio = { x: e.clientX, y: e.clientY };
      const base = { ...recorte };
      const valor = PROPORCIONES.find((p) => p.id === proporcion)?.valor ?? null;
      const rel = caja.height > 0 ? caja.width / caja.height : 1;

      const mover = (ev: PointerEvent) => {
        const dx = (ev.clientX - inicio.x) / caja.width;
        const dy = (ev.clientY - inicio.y) / caja.height;

        if (modo === "mover") {
          setRecorte({
            ...base,
            x: limitar(base.x + dx, 0, 1 - base.w),
            y: limitar(base.y + dy, 0, 1 - base.h),
          });
          return;
        }

        const derecha = base.x + base.w;
        const abajo = base.y + base.h;
        let x = base.x;
        let y = base.y;
        let w = base.w;
        let h = base.h;

        if (modo === "nw" || modo === "sw") {
          x = limitar(base.x + dx, 0, derecha - MIN);
          w = derecha - x;
        } else {
          w = limitar(base.w + dx, MIN, 1 - base.x);
        }

        if (valor) {
          // Con proporción fija el alto se deriva del ancho.
          h = (w * rel) / valor;
          if (h > 1) {
            h = 1;
            w = (h * valor) / rel;
            if (modo === "nw" || modo === "sw") x = derecha - w;
          }
          if (modo === "nw" || modo === "ne") {
            y = limitar(abajo - h, 0, 1 - h);
            h = Math.min(h, abajo - y);
          } else if (y + h > 1) {
            h = 1 - y;
            w = (h * valor) / rel;
            if (modo === "sw") x = derecha - w;
          }
        } else if (modo === "nw" || modo === "ne") {
          y = limitar(base.y + dy, 0, abajo - MIN);
          h = abajo - y;
        } else {
          h = limitar(base.h + dy, MIN, 1 - base.y);
        }

        setRecorte({ x, y, w: Math.max(MIN, w), h: Math.max(MIN, h) });
      };

      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
      };
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    },
    [proporcion, recorte]
  );

  const aplicar = async () => {
    if (!src || procesando) return;
    setProcesando(true);
    try {
      const recortada = await recortarImagen(src, recorte);
      onApply(recortada);
    } finally {
      setProcesando(false);
    }
  };

  const esquinas: { id: Esquina; clase: string }[] = [
    { id: "nw", clase: "-left-1.5 -top-1.5 cursor-nwse-resize" },
    { id: "ne", clase: "-right-1.5 -top-1.5 cursor-nesw-resize" },
    { id: "sw", clase: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
    { id: "se", clase: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
  ];

  return (
    <Modal open={open && !!src} onClose={onClose} title="Recortar imagen" className="max-w-lg">
      <div className="space-y-4">
        {/* El wrapper interno se ajusta al tamaño exacto de la imagen: los overlays
            se posicionan en % sobre ella, no sobre la caja del modal. */}
        <div className="flex select-none justify-center rounded-xl bg-muted p-2">
          <div className="relative inline-block leading-none">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              className="block max-h-[55vh] w-auto max-w-full rounded-lg"
            />
          )}

          {/* Velo oscuro con el área de recorte recortada por el borde grueso */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.55)",
              clipPath: `polygon(0% 0%, 0% 100%, ${recorte.x * 100}% 100%, ${recorte.x * 100}% ${
                recorte.y * 100
              }%, ${(recorte.x + recorte.w) * 100}% ${recorte.y * 100}%, ${(recorte.x + recorte.w) * 100}% ${
                (recorte.y + recorte.h) * 100
              }%, ${recorte.x * 100}% ${(recorte.y + recorte.h) * 100}%, ${recorte.x * 100}% 100%, 100% 100%, 100% 0%)`,
            }}
          />

          <div
            onPointerDown={(e) => arrastrar(e, "mover")}
            className="absolute cursor-move touch-none border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              left: `${recorte.x * 100}%`,
              top: `${recorte.y * 100}%`,
              width: `${recorte.w * 100}%`,
              height: `${recorte.h * 100}%`,
            }}
          >
            {esquinas.map((c) => (
              <div
                key={c.id}
                onPointerDown={(e) => arrastrar(e, c.id)}
                className={cn("absolute size-4 touch-none rounded-full border-2 border-white bg-primary", c.clase)}
              />
            ))}
          </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROPORCIONES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => aplicarProporcion(p.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                proporcion === p.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aplicar}
            disabled={procesando}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {procesando ? "Recortando…" : "Recortar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
