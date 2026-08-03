"use client";

// La carga inicial sincroniza con la API, que es el uso previsto de un effect.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, X, Monitor, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { consolaFetch, type CapturaConsola } from "@/lib/notas/consolaClient";
import { hhmm } from "@/lib/notas/trabajoClient";

// La pantalla de la notebook, vista desde el celular.
//
// Es UNA sola imagen: sacar una nueva reemplaza la anterior y borra su blob del
// store. Sin eso, una tarde de uso deja cien capturas pagando storage para
// mirar una.

export function VistaViva() {
  const [captura, setCaptura] = useState<CapturaConsola | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [zoom, setZoom] = useState(false);

  const cargar = useCallback(async () => {
    const res = await consolaFetch("/api/notas/consola/captura").catch(() => null);
    if (res?.ok) setCaptura((await res.json()).captura ?? null);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const esperando = pidiendo || captura?.estado === "pendiente";

  // Mientras hay una captura pedida se pregunta seguido: el carril tarda unos
  // segundos en sacarla y subirla, y la espera tiene que sentirse corta.
  useEffect(() => {
    if (!esperando) return;
    const t = setInterval(cargar, 2000);
    return () => clearInterval(t);
  }, [esperando, cargar]);

  const pedir = async () => {
    setPidiendo(true);
    await consolaFetch("/api/notas/consola/captura", { method: "POST" }).catch(() => {});
    setPidiendo(false);
    cargar();
  };

  return (
    <>
      <section className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Monitor className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pantalla de la notebook</span>
          {captura?.url && !esperando && (
            <span className="text-xs text-muted-foreground">{hhmm(captura.updatedAt)}</span>
          )}
          <button
            type="button"
            onClick={pedir}
            disabled={esperando}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {esperando ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {esperando ? "Sacando…" : captura?.url ? "Actualizar" : "Sacar captura"}
          </button>
        </div>

        {captura?.url ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="group relative block w-full"
            aria-label="Ampliar la captura"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={captura.url}
              alt="Pantalla de la notebook"
              className={cn("block w-full transition-opacity", esperando && "opacity-40")}
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-full bg-black/60 p-2.5 text-white">
                <ZoomIn className="size-5" />
              </span>
            </span>
          </button>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {esperando ? "Sacando la primera captura…" : "Tocá «Sacar captura» para ver la pantalla."}
          </p>
        )}
      </section>

      {zoom && captura?.url && <Lupa url={captura.url} onCerrar={() => setZoom(false)} />}
    </>
  );
}

// Visor con zoom por pellizco y arrastre. En el celular, una captura de una
// pantalla 4K entra tan chica que sin poder acercarse no se lee nada — que es
// justamente para lo que uno la pide.
function Lupa({ url, onCerrar }: { url: string; onCerrar: () => void }) {
  const [escala, setEscala] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const gesto = useRef<{ dist: number; escala: number } | null>(null);
  const arrastre = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  const distancia = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      gesto.current = { dist: distancia(e.touches), escala };
      arrastre.current = null;
    } else if (e.touches.length === 1 && escala > 1) {
      arrastre.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: pos.x, oy: pos.y };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && gesto.current) {
      e.preventDefault();
      const nueva = Math.min(6, Math.max(1, (distancia(e.touches) / gesto.current.dist) * gesto.current.escala));
      setEscala(nueva);
      // Al volver a 1 se recentra: con la imagen entera en pantalla, un
      // desplazamiento heredado del zoom anterior se ve como un bug.
      if (nueva === 1) setPos({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && arrastre.current) {
      e.preventDefault();
      setPos({
        x: arrastre.current.ox + (e.touches[0].clientX - arrastre.current.x),
        y: arrastre.current.oy + (e.touches[0].clientY - arrastre.current.y),
      });
    }
  };

  const soltar = () => {
    gesto.current = null;
    arrastre.current = null;
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-black/90">
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <span className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
        {escala > 1 ? `${escala.toFixed(1)}× · arrastrá para mover` : "Pellizcá para acercar · doble toque"}
      </span>

      <div
        className="flex h-full w-full touch-none items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={soltar}
        onDoubleClick={() => {
          setEscala((e) => (e > 1 ? 1 : 2.5));
          setPos({ x: 0, y: 0 });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Pantalla de la notebook"
          draggable={false}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})` }}
          className="max-h-full max-w-full origin-center object-contain transition-transform duration-75"
        />
      </div>
    </div>
  );
}
