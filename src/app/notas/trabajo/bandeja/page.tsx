"use client";

// La carga inicial sincroniza con la API en cuanto el device está listo, que es
// el uso previsto de un effect (igual que en /notas/[id]).
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, AlertTriangle, Clock, CheckCheck, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { PromptEditor } from "@/components/notas/trabajo/PromptEditor";
import { OverlaySugerencias } from "@/components/notas/trabajo/OverlaySugerencias";
import { BloqueId } from "@/components/notas/trabajo/bloqueId";
import { HarnessPanel } from "@/components/notas/trabajo/HarnessPanel";
import { PROYECTOS, type Bandeja, type SugerenciaTrabajo } from "@/lib/notas/trabajoClient";

// La bandeja tiene dos modos y eso simplifica todo el resto:
//
//  - EDICIÓN: un editor normal. Pegás el pegote, acomodás, apretás Analizar.
//  - REVISIÓN: cuando hay sugerencias, el editor pasa a sólo lectura y encima se
//    montan las ventanas. Sin esto habría que recalcular cada ventana en cada
//    tecla, y mover un borde competiría con el cursor.

const PLACEHOLDER =
  "Pegá acá todo lo que haya que hacer, tal como te llegó: explicaciones, capturas, lo que sea. Después apretás Analizar y el harness lo parte en ítems.";

export default function BandejaPage() {
  const router = useRouter();
  const { ready, deviceId } = useNotaDevice();

  const [bandeja, setBandeja] = useState<Bandeja | null>(null);
  const [sugerencias, setSugerencias] = useState<SugerenciaTrabajo[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [contenedor, setContenedor] = useState<HTMLElement | null>(null);
  // Un pedido encolado con el harness apagado se queda esperando para siempre.
  // El cartel tiene que decir eso y no "está en la cola", que suena a que algo
  // está pasando.
  const [harnessVivo, setHarnessVivo] = useState<boolean | null>(null);
  // Cambia cuando el contenido del crudo se reemplaza desde el servidor (al
  // confirmar), para volver a montar el editor con el texto nuevo.
  const [version, setVersion] = useState(0);
  const guardarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extensiones = useMemo(() => [BloqueId], []);

  const cargar = useCallback(async () => {
    const [res, resEstado] = await Promise.all([
      notasFetch("/api/notas/trabajo/bandeja").catch(() => null),
      notasFetch("/api/notas/trabajo/estado").catch(() => null),
    ]);
    if (resEstado?.ok) setHarnessVivo((await resEstado.json()).vivo === true);
    if (!res?.ok) return;
    const { bandeja } = await res.json();
    setBandeja(bandeja);
    setSugerencias(bandeja.sugerencias ?? []);
  }, []);

  useEffect(() => {
    if (ready && deviceId) cargar();
  }, [ready, deviceId, cargar]);

  // Mientras el pedido está en la cola del harness hay que esperar a que
  // aparezcan las sugerencias; el resto del tiempo no se pregunta nada.
  const esperando = bandeja?.estado === "pendiente" || bandeja?.estado === "analizando";
  useEffect(() => {
    if (!esperando) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, 5000);
    return () => clearInterval(t);
  }, [esperando, cargar]);

  const analizar = async () => {
    setAnalizando(true);
    const res = await notasFetch("/api/notas/trabajo/bandeja/analizar", { method: "POST" }).catch(() => null);
    setAnalizando(false);
    if (res?.ok) cargar();
    else if (res) alert((await res.json().catch(() => null))?.error ?? "No se pudo pedir el análisis");
  };

  // El rango se pinta en el acto y se guarda con un respiro: arrastrar un borde
  // dispara un cambio por bloque que pasa, y cada uno sería un PUT.
  const cambiarRango = useCallback((id: string, desdeBid: string, hastaBid: string) => {
    setSugerencias((prev) => prev.map((s) => (s.id === id ? { ...s, desdeBid, hastaBid } : s)));
    if (guardarTimer.current) clearTimeout(guardarTimer.current);
    guardarTimer.current = setTimeout(() => {
      notasFetch(`/api/notas/trabajo/sugerencias/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ desdeBid, hastaBid }),
      }).catch(() => {});
    }, 400);
  }, []);

  const cambiarCampo = useCallback((id: string, campo: "titulo" | "proyecto", valor: string) => {
    setSugerencias((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));
    if (guardarTimer.current) clearTimeout(guardarTimer.current);
    guardarTimer.current = setTimeout(() => {
      notasFetch(`/api/notas/trabajo/sugerencias/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [campo]: valor }),
      }).catch(() => {});
    }, 600);
  }, []);

  const confirmar = useCallback(
    async (id: string) => {
      setConfirmando(id);
      const res = await notasFetch(`/api/notas/trabajo/sugerencias/${id}/confirmar`, { method: "POST" }).catch(() => null);
      setConfirmando(null);
      if (!res?.ok) return;
      // El crudo cambió (sus bloques se fueron con el ítem): se recarga entero y
      // se remonta el editor, o la pantalla mostraría texto que ya no existe.
      const { contenido } = await res.json();
      setBandeja((prev) => (prev ? { ...prev, contenido } : prev));
      setSugerencias((prev) => prev.filter((s) => s.id !== id));
      setVersion((v) => v + 1);
    },
    []
  );

  const descartar = useCallback(async (id: string) => {
    setSugerencias((prev) => prev.filter((s) => s.id !== id));
    await notasFetch(`/api/notas/trabajo/sugerencias/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const confirmarTodas = async () => {
    // De a una y en orden: cada confirmación reescribe el crudo, y dos a la vez
    // pisarían el cambio de la otra.
    for (const s of [...sugerencias]) await confirmar(s.id);
  };

  const enRevision = sugerencias.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-5 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/notas/trabajo")} aria-label="Volver">
          <ArrowLeft />
        </Button>
        <h1 className="flex-1 truncate text-2xl font-bold tracking-tight">Bandeja en crudo</h1>
        <ThemeToggle />
      </header>

      <HarnessPanel />

      {/* Encabezado: las sugerencias apiladas */}
      {enRevision && (
        <section className="mb-4 rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">
              {sugerencias.length} {sugerencias.length === 1 ? "ítem propuesto" : "ítems propuestos"}
            </h2>
            <Button size="sm" variant="outline" className="ml-auto" onClick={confirmarTodas}>
              <CheckCheck className="size-4" />
              Confirmar todas
            </Button>
          </div>
          <ol className="space-y-1">
            {sugerencias.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => document.getElementById(`sugerencia-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{s.titulo || "Sin título"}</span>
                  {s.proyecto && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{s.proyecto}</span>}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            Arrastrá los bordes de cada ventana para incluir o excluir párrafos. Confirmar la manda a
            pendientes y saca ese texto de la bandeja; descartar sólo quita la ventana.
          </p>
        </section>
      )}

      {bandeja?.estado === "error" && bandeja.error && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          {bandeja.error}
        </p>
      )}

      {esperando &&
        (harnessVivo === false ? (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
            <PowerOff className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              El pedido quedó guardado, pero <strong>el harness está apagado</strong> y no hay nadie que
              lo lea. Arrancalo en la máquina con <code className="rounded bg-muted px-1 py-0.5 text-xs">runner.ps1</code> y
              lo toma en menos de 30 segundos.
            </span>
          </p>
        ) : (
          <p className="mb-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
            <Clock className="size-4 shrink-0 text-primary" />
            {bandeja?.estado === "analizando"
              ? "El harness está leyendo la bandeja…"
              : "En la cola del harness. Si ninguna cuenta tiene cuota, arranca cuando vuelva la primera."}
          </p>
        ))}

      {!bandeja ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className={cn("relative", enRevision && "bandeja-revision")}>
          <PromptEditor
            key={`bandeja-${version}`}
            bandejaId={bandeja.id}
            contenidoInicial={bandeja.contenido}
            editable={!enRevision}
            placeholder={PLACEHOLDER}
            extensiones={extensiones}
            onEditor={(editor) => setContenedor((editor?.view.dom as HTMLElement) ?? null)}
          />

          {enRevision && (
            <OverlaySugerencias
              contenedor={contenedor}
              sugerencias={sugerencias}
              proyectos={PROYECTOS}
              confirmando={confirmando}
              onCambiarRango={cambiarRango}
              onCambiarTitulo={(id, v) => cambiarCampo(id, "titulo", v)}
              onCambiarProyecto={(id, v) => cambiarCampo(id, "proyecto", v)}
              onConfirmar={confirmar}
              onDescartar={descartar}
            />
          )}
        </div>
      )}

      {!enRevision && (
        <Button onClick={analizar} disabled={analizando || esperando || !bandeja} className="mt-4" size="lg">
          {analizando || esperando ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Analizar y proponer ítems
        </Button>
      )}
    </div>
  );
}
