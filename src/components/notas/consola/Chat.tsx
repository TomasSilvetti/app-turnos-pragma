"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, User, Terminal, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { consolaFetch, type MensajeConsola, type SesionConsola } from "@/lib/notas/consolaClient";
import { hhmm } from "@/lib/notas/trabajoClient";

export function Chat({ sesionId, onCambio }: { sesionId: string; onCambio: () => void }) {
  const [sesion, setSesion] = useState<SesionConsola | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement | null>(null);
  const pegadoAbajo = useRef(true);

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

  // Seguir el final sólo si el usuario ya estaba abajo: si subió a leer algo,
  // que la respuesta lo empuje es de lo más molesto que hay.
  useEffect(() => {
    if (pegadoAbajo.current) fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sesion]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto("");
    pegadoAbajo.current = true;
    await consolaFetch(`/api/notas/consola/sesiones/${sesionId}/mensajes`, {
      method: "POST",
      body: JSON.stringify({ texto: t }),
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
      <div
        className="flex-1 space-y-3 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
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

      <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter manda, Shift+Enter hace salto. En el celular el teclado
            // trae su propia tecla de envío y esto no molesta.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={2}
          placeholder="Qué querés que haga en la notebook…"
          className="max-h-40 min-w-0 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!texto.trim() || enviando}
          aria-label="Enviar"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
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
        <div
          className={cn(
            "inline-block whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-left text-sm leading-relaxed",
            mio ? "bg-primary/10" : "border border-border bg-card"
          )}
        >
          {m.texto || (m.parcial ? "…" : "")}
          {m.parcial && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-foreground/60 align-middle" />}
        </div>

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
