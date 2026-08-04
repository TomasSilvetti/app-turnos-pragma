"use client";

// El effect de abajo sincroniza con un sistema externo (el polling de la
// sesión), que es justamente para lo que están los effects.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, User, Terminal, AlertTriangle, X, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { consolaFetch, type MensajeConsola, type SesionConsola } from "@/lib/notas/consolaClient";
import { hhmm } from "@/lib/notas/trabajoClient";
import { esImagen, archivoAImagenComprimida, manejarPegadoDeImagenes } from "@/lib/notas/imagen";

export function Chat({ sesionId, onCambio }: { sesionId: string; onCambio: () => void }) {
  const [sesion, setSesion] = useState<SesionConsola | null>(null);
  const [texto, setTexto] = useState("");
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement | null>(null);
  const inputArchivo = useRef<HTMLInputElement | null>(null);

  // El teclado táctil manda su propia tecla de "enviar" (o ninguna): ahí Enter
  // tiene que ser un salto de línea como en cualquier textarea. Sólo con
  // teclado físico Enter manda y Shift+Enter hace el salto.
  const [tactil] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  const cargar = useCallback(async () => {
    const res = await consolaFetch(`/api/notas/consola/sesiones/${sesionId}`).catch(() => null);
    if (res?.ok) setSesion((await res.json()).sesion);
  }, [sesionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const trabajando = sesion?.estado === "pendiente" || sesion?.estado === "pensando";

  // Mientras la sesión escribe se pregunta seguido: es lo que hace que la
  // respuesta se vea aparecer en vez de saltar entera al final.
  useEffect(() => {
    if (!trabajando) return;
    const t = setInterval(cargar, 1500);
    return () => clearInterval(t);
  }, [trabajando, cargar]);

  const subirImagenes = useCallback(
    async (files: File[]) => {
      const validos = files.filter(esImagen);
      if (validos.length === 0) return;
      setSubiendoImagen(true);
      for (const file of validos) {
        try {
          const dataUrl = await archivoAImagenComprimida(file);
          const blob = await fetch(dataUrl).then((r) => r.blob());
          const form = new FormData();
          form.append("file", new File([blob], "adjunto.webp", { type: blob.type }));
          const res = await consolaFetch(`/api/notas/consola/sesiones/${sesionId}/imagenes`, {
            method: "POST",
            body: form,
          }).catch(() => null);
          if (res?.ok) {
            const { url } = await res.json();
            setImagenes((prev) => [...prev, url]);
          }
        } catch {
          // Una imagen que no comprime o no sube no debe tirar abajo las demás.
        }
      }
      setSubiendoImagen(false);
    },
    [sesionId]
  );

  const enviar = async () => {
    const t = texto.trim();
    if ((!t && imagenes.length === 0) || enviando) return;
    setEnviando(true);
    setTexto("");
    const imgs = imagenes;
    setImagenes([]);
    fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    await consolaFetch(`/api/notas/consola/sesiones/${sesionId}/mensajes`, {
      method: "POST",
      body: JSON.stringify({ texto: t, imagenes: imgs }),
    }).catch(() => {});
    setEnviando(false);
    await cargar();
    onCambio();
  };

  const destrabar = async () => {
    await consolaFetch(`/api/notas/consola/sesiones/${sesionId}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "idle" }),
    }).catch(() => {});
    cargar();
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-x-hidden overflow-y-auto">
        {!sesion ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : (sesion.mensajes ?? []).length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Escribí abajo. Es una sesión de Claude Code corriendo en tu notebook, con permisos
            completos.
          </p>
        ) : (
          (sesion.mensajes ?? []).map((m) => <Burbuja key={m.id} m={m} onImagen={setAmpliada} />)
        )}

        {sesion?.estado === "pendiente" && (
          <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            En cola. Si la consola está apagada en la notebook, esto no avanza.
          </p>
        )}

        {sesion?.error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p>{sesion.error}</p>
              <button onClick={destrabar} className="mt-1 text-xs font-medium text-primary underline">
                Destrabar la sesión
              </button>
            </div>
          </div>
        )}

        <div ref={fondo} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {imagenes.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {imagenes.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-16 rounded-md border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setImagenes((prev) => prev.filter((u) => u !== url))}
                  aria-label="Quitar imagen"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={inputArchivo}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) subirImagenes(files);
            }}
          />
          <button
            type="button"
            onClick={() => inputArchivo.current?.click()}
            disabled={subiendoImagen}
            aria-label="Adjuntar imagen"
            title="Adjuntar imagen"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {subiendoImagen ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          </button>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !tactil) {
                e.preventDefault();
                enviar();
              }
            }}
            onPaste={(e) => {
              if (manejarPegadoDeImagenes(e.clipboardData, subirImagenes)) e.preventDefault();
            }}
            rows={2}
            placeholder="Qué querés que haga en la notebook…"
            className="max-h-40 min-w-0 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={(!texto.trim() && imagenes.length === 0) || enviando}
            aria-label="Enviar"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>

      {ampliada && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setAmpliada(null)}
        >
          <button type="button" aria-label="Cerrar" className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}

// Overrides mínimos de markdown: sin plugin de tipografía, así que el
// espaciado y el tamaño se ajustan a mano para que quepan en una burbuja.
const componentesMarkdown = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noreferrer" className="break-all text-primary underline">
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-1.5 border-l-2 border-border pl-2 text-muted-foreground last:mb-0">{children}</blockquote>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 font-semibold">{children}</p>,
  // Bloque vs. inline se distingue por el lenguaje (```js) o por si tiene
  // salto de línea: react-markdown ya no manda un booleano "inline".
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const esBloque = /language-/.test(className ?? "") || String(children).includes("\n");
    if (esBloque) {
      return <code className={cn("block font-mono text-[0.8em] leading-snug", className)}>{children}</code>;
    }
    return <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>;
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-1.5 max-w-full overflow-x-auto rounded-lg bg-foreground/10 p-2 last:mb-0">{children}</pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1.5 max-w-full overflow-x-auto last:mb-0">
      <table className="border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => <td className="border border-border px-2 py-1">{children}</td>,
  img: ({ src, alt }: React.ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} className="max-w-full rounded-md" />
  ),
};

function Burbuja({ m, onImagen }: { m: MensajeConsola; onImagen: (url: string) => void }) {
  const mio = m.rol === "usuario";
  return (
    <div className={cn("flex gap-2", mio && "flex-row-reverse")}>
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
          mio ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {mio ? <User className="size-3.5" /> : <Terminal className="size-3.5" />}
      </span>

      <div className={cn("min-w-0 max-w-[85%] space-y-1.5", mio && "items-end text-right")}>
        {(m.texto || m.parcial) && (
          <div
            className={cn(
              "inline-block max-w-full overflow-hidden whitespace-normal break-words rounded-xl px-3 py-2 text-left text-sm leading-relaxed [overflow-wrap:anywhere]",
              mio ? "bg-primary/10" : "border border-border bg-card"
            )}
          >
            {m.texto ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentesMarkdown}>
                {m.texto}
              </ReactMarkdown>
            ) : (
              "…"
            )}
            {m.parcial && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-foreground/60 align-middle" />}
          </div>
        )}

        {m.imagenes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.imagenes.map((url) => (
              <button key={url} type="button" onClick={() => onImagen(url)} className="overflow-hidden rounded-md border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" className="h-24 w-auto object-cover" />
              </button>
            ))}
          </div>
        )}

        <p className="px-1 text-[10px] text-muted-foreground">{hhmm(m.createdAt)}</p>
      </div>
    </div>
  );
}
