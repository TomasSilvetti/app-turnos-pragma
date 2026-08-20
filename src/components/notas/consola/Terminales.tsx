"use client";

// La carga inicial sincroniza con la API, que es el uso previsto de un effect.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, TerminalSquare, Pencil, Check, AlertCircle, OctagonX } from "lucide-react";
import { cn } from "@/lib/utils";
import { consolaFetch, type TerminalConsola } from "@/lib/notas/consolaClient";
import { hhmm } from "@/lib/notas/trabajoClient";

// Las pestañas de Windows Terminal que ya están abiertas en la notebook, con un
// Claude Code corriendo adentro.
//
// A diferencia del chat de la consola, acá la app no maneja la sesión: sólo le
// tipea el prompt a una consola ajena y le lee la pantalla. Por eso lo único
// que se ve es la última foto del buffer, no un historial.

const REFRESCO_MS = 3000;

export function Terminales() {
  const [terminales, setTerminales] = useState<TerminalConsola[]>([]);
  const [agenteVivo, setAgenteVivo] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const cargar = useCallback(async () => {
    const res = await consolaFetch("/api/notas/consola/terminales").catch(() => null);
    if (!res?.ok) return;
    const datos = await res.json();
    setTerminales(datos.terminales);
    setAgenteVivo(datos.agenteVivo);
    setCargado(true);
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const vivas = terminales.filter((t) => t.viva);

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <TerminalSquare className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Terminales abiertas</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
            agenteVivo ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
          )}
        >
          {agenteVivo ? `${vivas.length} en la notebook` : "agente apagado"}
        </span>
      </div>

      {!cargado && (
        <p className="px-3 py-4 text-sm text-muted-foreground">Buscando…</p>
      )}

      {cargado && vivas.length === 0 && (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          {agenteVivo
            ? "No hay ninguna terminal abierta en la notebook."
            : "El agente no está corriendo en la notebook, así que no se ve ninguna terminal."}
        </p>
      )}

      <ul className="divide-y divide-border">
        {vivas.map((t) => (
          <Fila
            key={t.id}
            terminal={t}
            abierta={abierta === t.id}
            onAbrir={() => setAbierta((a) => (a === t.id ? null : t.id))}
            onCambio={cargar}
          />
        ))}
      </ul>
    </section>
  );
}

function Fila({
  terminal,
  abierta,
  onAbrir,
  onCambio,
}: {
  terminal: TerminalConsola;
  abierta: boolean;
  onAbrir: () => void;
  onCambio: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [escapando, setEscapando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [apodo, setApodo] = useState(terminal.apodo);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    const res = await consolaFetch(`/api/notas/consola/terminales/${terminal.id}`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    }).catch(() => null);
    setEnviando(false);

    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? "No se pudo mandar");
      return;
    }
    setTexto("");
    onCambio();
  };

  // Esc interrumpe lo que Claude Code esté haciendo. No pide confirmación a
  // propósito: se aprieta justo cuando algo se fue por el camino equivocado, y
  // un "¿seguro?" en el medio le saca el sentido.
  const escapar = async () => {
    setEscapando(true);
    setError(null);
    const res = await consolaFetch(`/api/notas/consola/terminales/${terminal.id}`, {
      method: "POST",
      body: JSON.stringify({ tecla: "esc" }),
    }).catch(() => null);
    setEscapando(false);

    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? "No se pudo mandar el Esc");
      return;
    }
    onCambio();
  };

  const guardarApodo = async () => {
    setEditando(false);
    await consolaFetch(`/api/notas/consola/terminales/${terminal.id}`, {
      method: "PATCH",
      body: JSON.stringify({ apodo }),
    }).catch(() => {});
    onCambio();
  };

  // El título lo escribe Claude Code y cambia solo mientras trabaja, así que el
  // apodo manda cuando existe.
  const nombre = terminal.apodo || terminal.titulo || `PID ${terminal.pid}`;
  const ultimo = terminal.envios[0];

  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted", abierta && "bg-muted")}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{nombre}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            PID {terminal.pid}
            {terminal.apodo && terminal.titulo && ` · ${terminal.titulo}`}
          </p>
        </div>
        {ultimo?.estado === "pendiente" && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        {ultimo?.estado === "error" && <AlertCircle className="size-4 shrink-0 text-destructive" />}
      </button>

      {abierta && (
        <div className="space-y-2 px-3 pb-3">
          <div className="flex items-center gap-1.5">
            {editando ? (
              <>
                <input
                  autoFocus
                  value={apodo}
                  onChange={(e) => setApodo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && guardarApodo()}
                  placeholder="Apodo de esta terminal"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="button" onClick={guardarApodo} className="rounded-md p-1.5 hover:bg-muted" aria-label="Guardar apodo">
                  <Check className="size-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3" />
                {terminal.apodo ? "Cambiar apodo" : "Ponerle un apodo"}
              </button>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground">{hhmm(terminal.vistoEn)}</span>
            {/* Arriba de todo y no junto a "Mandar": el Esc se aprieta cuando
                algo se fue por mal camino, y ahí no se quiere estar buscándolo. */}
            <button
              type="button"
              onClick={escapar}
              disabled={escapando}
              title="Interrumpir lo que esté haciendo"
              className="flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {escapando ? <Loader2 className="size-3 animate-spin" /> : <OctagonX className="size-3" />}
              Esc
            </button>
          </div>

          {/* La foto del buffer. Se lee de abajo hacia arriba, así que el scroll
              arranca abajo del todo, donde está el prompt. */}
          <pre
            ref={(el) => {
              if (el) el.scrollTop = el.scrollHeight;
            }}
            className="max-h-56 overflow-auto rounded-lg bg-muted p-2.5 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground"
          >
            {terminal.pantalla.trimEnd() || "(pantalla vacía)"}
          </pre>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder="Prompt para tipear en esta terminal…"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />

          {error && <p className="text-xs text-destructive">{error}</p>}
          {ultimo?.estado === "error" && !error && (
            <p className="text-xs text-destructive">No se pudo tipear: {ultimo.error}</p>
          )}

          <div className="flex items-center gap-2">
            <p className="flex-1 text-[11px] text-muted-foreground">
              Se escribe tal cual y se manda con Enter. Los saltos de línea se aplastan a espacios.
            </p>
            <button
              type="button"
              onClick={enviar}
              disabled={!texto.trim() || enviando}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Mandar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
